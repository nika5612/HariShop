import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import {
  getOrderDetails,
  deliverOrder,
  cancelOrderRequest,
  approveCancelOrder,
  rejectCancelOrder,
  trackOrder,
  updateOrderStatus,
  requestRefund,
  completeRefund,
  updateCodPaymentStatus,
} from '../actions/orderActions'
import { deleteOrderByAdmin } from '../actions/orderAdminActions'
import { unlockCod } from '../actions/userActions'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

import {
  ORDER_PAY_RESET,
  ORDER_DELIVER_RESET,
  ORDER_CANCEL_REQUEST_RESET,
  ORDER_APPROVE_CANCEL_RESET,
  ORDER_REJECT_CANCEL_RESET,
  ORDER_TRACK_RESET,
  ORDER_UPDATE_STATUS_RESET,
  ORDER_REFUND_REQUEST_RESET,
  ORDER_REFUND_COMPLETE_RESET,
  ORDER_COD_PAYMENT_RESET,
} from '../constants/orderConstants'
import { USER_UNLOCK_COD_RESET } from '../constants/userConstants'
import {
  STATUS_STEPS,
  BRANCH_STATUSES,
  ADMIN_STATUS_OPTIONS,
  getOrderStatusInfo,
} from '../constants/orderStatusConfig'

const SEPAY_BANK_ID  = 'VCB'
const SEPAY_ACCOUNT  = '0000000001'

const SEPAY_TEMPLATE = 'compact2'

const buildVietQRUrl = (amount, content) =>
  `https://img.vietqr.io/image/${SEPAY_BANK_ID}-${SEPAY_ACCOUNT}-${SEPAY_TEMPLATE}.png` +
  `?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=HARISHOP`
// ─────────────────────────────────────────────────────────────────────────────

// MỚI: đếm ngược tới thời điểm đơn tự động bị hủy (24h kể từ lúc đặt) nếu
// vẫn chưa thanh toán — dùng chung cho cả badge gọn (thanh trạng thái) và
// box chi tiết (khu vực QR) bên dưới.
const AUTO_CANCEL_HOURS = 24

const useAutoCancelCountdown = (createdAt) => {
  const deadline = new Date(createdAt).getTime() + AUTO_CANCEL_HOURS * 60 * 60 * 1000
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now())

  useEffect(() => {
    const tick = setInterval(() => {
      setRemainingMs(deadline - Date.now())
    }, 1000)
    return () => clearInterval(tick)
  }, [deadline])

  return remainingMs
}

const formatCountdown = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// Badge gọn — đặt cạnh các StatusBadge khác trên thanh trạng thái đầu trang.
const AutoCancelStatusBadge = ({ createdAt }) => {
  const remainingMs = useAutoCancelCountdown(createdAt)
  const isUrgent = remainingMs < 60 * 60 * 1000
  const color = remainingMs <= 0 ? '#e53935' : isUrgent ? '#e53935' : '#ffd166'

  return (
    <StatusBadge color={color}>
      <i className='fas fa-hourglass-half'></i>
      {remainingMs <= 0 ? 'Sắp tự hủy do quá hạn' : `Tự hủy sau ${formatCountdown(remainingMs)}`}
    </StatusBadge>
  )
}

// Box chi tiết — đặt trong khu vực QR thanh toán.
const AutoCancelCountdown = ({ createdAt }) => {
  const remainingMs = useAutoCancelCountdown(createdAt)

  if (remainingMs <= 0) {
    return (
      <div style={{
        marginTop: '16px', background: 'rgba(230,57,70,0.12)',
        border: '1px solid #e53935', borderRadius: '10px',
        padding: '12px 16px', textAlign: 'center', color: '#e53935', fontSize: '13px',
      }}>
        <i className='fas fa-triangle-exclamation me-1'></i>
        Đơn đã quá hạn thanh toán, hệ thống sẽ sớm tự động hủy đơn này.
      </div>
    )
  }

  const isUrgent = remainingMs < 60 * 60 * 1000
  const color = isUrgent ? '#e53935' : '#f0a500'

  return (
    <div style={{
      marginTop: '16px',
      background: isUrgent ? 'rgba(230,57,70,0.12)' : 'rgba(240,165,0,0.1)',
      border: `1px solid ${color}`, borderRadius: '10px',
      padding: '12px 16px', textAlign: 'center',
    }}>
      <div style={{ color, fontSize: '13px', marginBottom: '4px' }}>
        <i className='fas fa-hourglass-half me-1'></i>
        Đơn sẽ tự động hủy nếu chưa thanh toán trong
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '2px', color, fontVariantNumeric: 'tabular-nums' }}>
        {formatCountdown(remainingMs)}
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_LABELS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  online: 'Chuyển khoản / QR Code',
  momo: 'Ví MoMo',
  vietcombank: 'Vietcombank',
}

const PAYMENT_ICONS = {
  cod: 'fas fa-money-bill-wave',
  online: 'fas fa-qrcode',
  momo: 'fas fa-wallet',
  vietcombank: 'fas fa-university',
}

const carrierLabel = (carrier) => {
  switch (carrier) {
    case 'ghn': return 'GHN'
    case 'viettelpost': return 'Viettel Post'
    case 'ghtk': return 'GHTK'
    case 'fallback': return 'Tạm tính'
    default: return carrier
  }
}

const DELIVERY_LABELS = {
  nhanh: 'Giao hàng nhanh',
  tietkiem: 'Giao hàng tiết kiệm',
  jnt: 'J&T',
  viettelpost: 'Viettel Post',
}

const sectionStyle = {
  background: '#1a1a2e',
  borderRadius: '16px',
  border: '1px solid rgba(51,255,204,0.15)',
  padding: '24px',
  marginBottom: '20px',
}

const labelStyle = { color: '#b8bcc8', fontSize: '13px', marginBottom: '4px' }
const valueStyle = { color: '#ffffff', fontWeight: '600', fontSize: '15px' }

const StatusBadge = ({ children, color = '#33FFCC' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: `${color}18`, border: `1px solid ${color}`,
    color, borderRadius: '20px', padding: '4px 14px',
    fontSize: '13px', fontWeight: '600',
  }}>
    {children}
  </span>
)

// ─── GHN Status mapping ───────────────────────────────────────────────────────
const GHN_STATUS_LABEL = {
  ready_to_pick: { label: 'Chờ lấy hàng', color: '#ffd166', icon: 'fas fa-box' },
  picking: { label: 'Đang lấy hàng', color: '#ffd166', icon: 'fas fa-truck' },
  cancel: { label: 'Đã hủy', color: '#ff6b6b', icon: 'fas fa-times-circle' },
  money_collect_picking: { label: 'Đang thu tiền khi lấy', color: '#ffd166', icon: 'fas fa-money-bill' },
  picked: { label: 'Đã lấy hàng', color: '#33FFCC', icon: 'fas fa-check' },
  storing: { label: 'Đang lưu kho', color: '#b8bcc8', icon: 'fas fa-warehouse' },
  transporting: { label: 'Đang vận chuyển', color: '#33FFCC', icon: 'fas fa-shipping-fast' },
  sorting: { label: 'Đang phân loại', color: '#b8bcc8', icon: 'fas fa-sort' },
  delivering: { label: 'Đang giao hàng', color: '#33FFCC', icon: 'fas fa-truck' },
  money_collect_delivering: { label: 'Đang thu tiền khi giao', color: '#ffd166', icon: 'fas fa-money-bill' },
  delivered: { label: 'Đã giao hàng', color: '#4cdb80', icon: 'fas fa-check-circle' },
  delivery_fail: { label: 'Giao thất bại', color: '#ff6b6b', icon: 'fas fa-times' },
  waiting_to_return: { label: 'Chờ hoàn hàng', color: '#ff6b6b', icon: 'fas fa-undo' },
  return: { label: 'Đang hoàn hàng', color: '#ff6b6b', icon: 'fas fa-undo-alt' },
  returned: { label: 'Đã hoàn hàng', color: '#ff6b6b', icon: 'fas fa-check' },
  exception: { label: 'Ngoại lệ', color: '#ff6b6b', icon: 'fas fa-exclamation-triangle' },
  lost: { label: 'Thất lạc', color: '#ff6b6b', icon: 'fas fa-question-circle' },
}

const getGHNStatus = (status) =>
  GHN_STATUS_LABEL[status] || { label: status || 'Không rõ', color: '#b8bcc8', icon: 'fas fa-circle' }

// ─── A3: 12 trạng thái đơn hàng chi tiết theo timeline ───────────────────────
// (STATUS_STEPS, BRANCH_STATUSES, ADMIN_STATUS_OPTIONS được import dùng chung
// từ '../constants/orderStatusConfig' — xem import ở đầu file)

const formatDateTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Component Timeline dọc ───────────────────────────────────────────────────
const OrderTimeline = ({ order, isAdmin }) => {
  const dispatch = useDispatch()
  const orderUpdateStatus = useSelector((state) => state.orderUpdateStatus)
  const { loading: loadingStatus, error: errorStatus, success: successStatus } = orderUpdateStatus

  const [selectedStatus, setSelectedStatus] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (successStatus) {
      dispatch({ type: ORDER_UPDATE_STATUS_RESET })
      setNote('')
      setSelectedStatus('')
    }
  }, [successStatus, dispatch])

  const currentStatus = order.status || (order.isCancelled ? 'cancelled' : order.isDelivered ? 'delivered' : 'pending')
  const isBranch = !!BRANCH_STATUSES[currentStatus]
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus)

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : []
  const historyMap = {}
  history.forEach((h) => { historyMap[h.status] = h })

  const submitStatusHandler = () => {
    if (!selectedStatus) return
    if (window.confirm(`Cập nhật trạng thái đơn hàng sang "${ADMIN_STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label}"?`)) {
      dispatch(updateOrderStatus(order._id, selectedStatus, note))
    }
  }

  return (
    <div style={sectionStyle}>
      <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '20px' }}>
        <i className='fas fa-stream me-2'></i>Trạng thái đơn hàng
      </h5>

      {/* ── Timeline dọc chính (8 bước) ── */}
      <div style={{ position: 'relative', paddingLeft: '4px' }}>
        {STATUS_STEPS.map((step, i) => {
          const isDone = !isBranch && i < currentIndex
          const isCurrent = !isBranch && i === currentIndex
          const eventInfo = historyMap[step.key]

          const dotColor = isCurrent ? '#33FFCC' : isDone ? '#4cdb80' : '#3a3a55'
          const textColor = isCurrent ? '#33FFCC' : isDone ? '#eef0f7' : '#6b7085'

          return (
            <div key={step.key} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
              {/* Đường nối + chấm tròn */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: isCurrent ? 'rgba(51,255,204,0.15)' : isDone ? 'rgba(76,219,128,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${dotColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, zIndex: 1,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(51,255,204,0.15)' : 'none',
                }}>
                  <i className={step.icon} style={{ fontSize: '13px', color: dotColor }}></i>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '28px',
                    background: isDone ? '#4cdb80' : '#2a2a45',
                    margin: '2px 0',
                  }} />
                )}
              </div>

              {/* Nội dung bước */}
              <div style={{ paddingBottom: '22px', flex: 1 }}>
                <div style={{ color: textColor, fontWeight: isCurrent ? '700' : '600', fontSize: '14px' }}>
                  {step.label}
                  {isCurrent && (
                    <span style={{
                      marginLeft: '8px', fontSize: '11px', color: '#0f0f23',
                      background: '#33FFCC', padding: '2px 8px', borderRadius: '10px', fontWeight: '700',
                    }}>
                      Hiện tại
                    </span>
                  )}
                </div>
                {eventInfo && (
                  <div style={{ color: '#8a8fa3', fontSize: '12px', marginTop: '2px' }}>
                    {formatDateTime(eventInfo.changedAt)}
                    {eventInfo.note ? ` — ${eventInfo.note}` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Trạng thái rẽ nhánh (hủy / thất bại / hoàn hàng) ── */}
      {isBranch && (
        <div style={{
          marginTop: '4px', padding: '14px 16px', borderRadius: '10px',
          background: `${BRANCH_STATUSES[currentStatus].color}12`,
          border: `1px solid ${BRANCH_STATUSES[currentStatus].color}`,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <i className={BRANCH_STATUSES[currentStatus].icon} style={{ color: BRANCH_STATUSES[currentStatus].color, fontSize: '16px' }}></i>
          <div>
            <div style={{ color: BRANCH_STATUSES[currentStatus].color, fontWeight: '700', fontSize: '14px' }}>
              {BRANCH_STATUSES[currentStatus].label}
            </div>
            {historyMap[currentStatus] && (
              <div style={{ color: '#8a8fa3', fontSize: '12px', marginTop: '2px' }}>
                {formatDateTime(historyMap[currentStatus].changedAt)}
                {historyMap[currentStatus].note ? ` — ${historyMap[currentStatus].note}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin: dropdown cập nhật trạng thái thủ công ── */}
      {isAdmin && (
        <div style={{
          marginTop: '20px', paddingTop: '20px',
          borderTop: '1px dashed rgba(51,255,204,0.25)',
        }}>
          <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '8px' }}>
            <i className='fas fa-user-shield me-2'></i>Admin — Cập nhật trạng thái thủ công
          </div>
          {errorStatus && <Message variant='danger'>{errorStatus}</Message>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                background: '#0f0f23', color: '#ffffff',
                border: '1px solid rgba(51,255,204,0.4)', borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', minWidth: '180px',
              }}
            >
              <option value=''>-- Chọn trạng thái --</option>
              {ADMIN_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type='text'
              placeholder='Ghi chú (không bắt buộc)'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                flex: 1, minWidth: '160px', background: '#0f0f23', color: '#ffffff',
                border: '1px solid rgba(51,255,204,0.4)', borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', outline: 'none',
              }}
            />
            <button
              onClick={submitStatusHandler}
              disabled={!selectedStatus || loadingStatus}
              style={{
                background: !selectedStatus || loadingStatus ? '#3a3a55' : '#33FFCC',
                border: 'none', borderRadius: '8px', padding: '8px 18px',
                color: !selectedStatus || loadingStatus ? '#8a8fa3' : '#0f0f23',
                fontWeight: '700', fontSize: '13px',
                cursor: !selectedStatus || loadingStatus ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingStatus ? <><i className='fas fa-spinner fa-spin me-2'></i>Đang lưu...</> : 'Cập nhật'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tracking UI Component ────────────────────────────────────────────────────
const TrackingSection = ({ orderId }) => {
  const dispatch = useDispatch()
  const orderTrack = useSelector((state) => state.orderTrack)
  const { loading, error, trackingData } = orderTrack || {}
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    return () => dispatch({ type: ORDER_TRACK_RESET })
  }, [dispatch])

  const handleTrack = () => {
    setExpanded(true)
    dispatch(trackOrder(orderId))
  }

  const currentStatus = trackingData?.currentStatus
    ? getGHNStatus(trackingData.currentStatus)
    : null

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? '20px' : '0' }}>
        <h5 style={{ color: '#33FFCC', fontWeight: '700', margin: 0 }}>
          <i className='fas fa-route me-2'></i>Theo dõi vận chuyển
        </h5>
        <button
          onClick={handleTrack}
          disabled={loading}
          style={{
            background: 'transparent', border: '1px solid #33FFCC',
            color: '#33FFCC', borderRadius: '8px',
            padding: '6px 16px', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <><i className='fas fa-spinner fa-spin me-2'></i>Đang tải...</>
            : <><i className='fas fa-sync-alt me-2'></i>Cập nhật</>}
        </button>
      </div>

      {error && <Message variant='danger'>{error}</Message>}

      {trackingData && !trackingData.available && (
        <div style={{ color: '#b8bcc8', fontSize: '14px', marginTop: '12px' }}>
          <i className='fas fa-info-circle me-2'></i>
          {trackingData.reason || 'Chưa có thông tin vận chuyển'}
        </div>
      )}

      {trackingData?.available && (
        <div style={{ marginTop: '4px' }}>
          <div style={{
            background: 'rgba(51,255,204,0.06)', borderRadius: '10px',
            padding: '12px 16px', border: '1px solid rgba(51,255,204,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
          }}>
            <div>
              <div style={labelStyle}>Mã vận đơn GHN</div>
              <div style={{ color: '#33FFCC', fontWeight: '700', fontSize: '16px', letterSpacing: '1px' }}>
                {trackingData.orderCode}
              </div>
            </div>
            {currentStatus && (
              <StatusBadge color={currentStatus.color}>
                <i className={`${currentStatus.icon}`}></i>
                {currentStatus.label}
              </StatusBadge>
            )}
            {trackingData.trackingUrl && (
              <a href={trackingData.trackingUrl} target='_blank' rel='noreferrer' style={{
                color: '#33FFCC', fontSize: '13px', textDecoration: 'none',
                border: '1px solid rgba(51,255,204,0.4)', borderRadius: '8px',
                padding: '4px 12px',
              }}>
                <i className='fas fa-external-link-alt me-1'></i>GHN Tracking
              </a>
            )}
          </div>

          {trackingData.events && trackingData.events.length > 0 ? (
            <div>
              <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '12px' }}>
                Lịch sử vận chuyển ({trackingData.events.length} sự kiện)
              </div>
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                <div style={{
                  position: 'absolute', left: '7px', top: '8px',
                  width: '2px', bottom: '8px',
                  background: 'rgba(51,255,204,0.2)',
                }}></div>
                {trackingData.events.map((event, idx) => {
                  const st = getGHNStatus(event.status)
                  return (
                    <div key={idx} style={{ position: 'relative', marginBottom: '16px', paddingLeft: '20px' }}>
                      <div style={{
                        position: 'absolute', left: '-17px', top: '4px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: idx === 0 ? st.color : 'rgba(51,255,204,0.3)',
                        border: `2px solid ${idx === 0 ? st.color : 'rgba(51,255,204,0.2)'}`,
                      }}></div>
                      <div style={{
                        background: idx === 0 ? 'rgba(51,255,204,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${idx === 0 ? 'rgba(51,255,204,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '10px', padding: '10px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ color: idx === 0 ? st.color : '#ffffff', fontWeight: '600', fontSize: '14px' }}>
                            <i className={`${st.icon} me-2`}></i>{st.label}
                          </span>
                          {event.time && (
                            <span style={{ color: '#b8bcc8', fontSize: '12px' }}>
                              {new Date(event.time).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                        {event.location && (
                          <div style={{ color: '#b8bcc8', fontSize: '12px', marginTop: '4px' }}>
                            <i className='fas fa-map-marker-alt me-1'></i>{event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ color: '#b8bcc8', fontSize: '13px' }}>
              <i className='fas fa-info-circle me-2'></i>Chưa có lịch sử vận chuyển
            </div>
          )}

          {trackingData.estimatedDelivery && (
            <div style={{
              marginTop: '12px', background: 'rgba(51,255,204,0.06)',
              borderRadius: '10px', padding: '10px 14px',
              border: '1px solid rgba(51,255,204,0.15)',
            }}>
              <span style={{ color: '#b8bcc8', fontSize: '13px' }}>
                <i className='fas fa-calendar-check me-2' style={{ color: '#33FFCC' }}></i>
                Dự kiến giao: <strong style={{ color: '#33FFCC' }}>
                  {new Date(trackingData.estimatedDelivery).toLocaleDateString('vi-VN')}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── QR Thanh toán SePay ──────────────────────────────────────────────────────
const SepayQRSection = ({ order }) => {

  const dispatch = useDispatch()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (order.isPaid) return
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          dispatch(getOrderDetails(order._id))
          return 10
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [dispatch, order._id, order.isPaid])

  if (order.isPaid) return null

  const qrUrl = buildVietQRUrl(order.totalPrice, order.transferContent)

  return (
    <div style={{ ...sectionStyle, border: '1px solid rgba(51,255,204,0.4)' }}>
      <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
        <i className='fas fa-qrcode me-2'></i>Quét mã thanh toán
      </h5>

      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', textAlign: 'center' }}>
        <img
          src={qrUrl}
          alt='QR chuyển khoản'
          style={{ width: '220px', height: '220px', objectFit: 'contain' }}
        />

        {/* Thông tin chuyển khoản */}
        <div style={{
          marginTop: '16px', background: '#f8f9fa',
          borderRadius: '10px', padding: '12px 16px',
          textAlign: 'left', fontSize: '13px', color: '#333',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#666' }}>Ngân hàng</span>
            <strong>{SEPAY_BANK_ID}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#666' }}>Số tài khoản</span>
            <strong>{SEPAY_ACCOUNT}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#666' }}>Số tiền</span>
            <strong style={{ color: '#e53935' }}>{order.totalPrice?.toLocaleString('vi-VN')}đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>Nội dung CK</span>
            <strong style={{
              background: '#fff3cd', borderRadius: '6px',
              padding: '2px 10px', letterSpacing: '1px', color: '#333', fontSize: '14px',
            }}>
              {order.transferContent}
            </strong>
          </div>
        </div>

        <p style={{ color: '#888', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
          <i className='fas fa-info-circle me-1' style={{ color: '#f0a500' }}></i>
          Giữ nguyên nội dung chuyển khoản để hệ thống tự xác nhận
        </p>
      </div>

      {/* MỚI: đếm ngược tới lúc đơn tự động bị hủy nếu chưa thanh toán */}
      <AutoCancelCountdown createdAt={order.createdAt} />

      {/* Tự kiểm tra mỗi 10 giây */}
      <div style={{
        marginTop: '12px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', color: '#b8bcc8', fontSize: '13px',
      }}>
        <i className='fas fa-spinner fa-spin' style={{ color: '#33FFCC' }}></i>
        Tự động kiểm tra thanh toán sau <strong style={{ color: '#33FFCC' }}>{countdown}s</strong>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

const OrderScreen = ({ match, history }) => {
  const orderId = match.params.id
  const dispatch = useDispatch()

  const orderDetails = useSelector((state) => state.orderDetails)
  const { order, loading, error } = orderDetails
  const orderIdInState = order?._id

  const orderDeliver = useSelector((state) => state.orderDeliver)
  const { loading: loadingDeliver, success: successDeliver } = orderDeliver

  const orderCancelRequest = useSelector((state) => state.orderCancelRequest)
  const { success: successCancelReq } = orderCancelRequest

  const orderApproveCancel = useSelector((state) => state.orderApproveCancel)
  const { success: successApproveCancel } = orderApproveCancel

  const orderRejectCancel = useSelector((state) => state.orderRejectCancel)
  const { success: successRejectCancel } = orderRejectCancel

  const orderRefundRequest = useSelector((state) => state.orderRefundRequest)
  const { loading: loadingRefundReq, error: errorRefundReq, success: successRefundReq } = orderRefundRequest

  const orderRefundComplete = useSelector((state) => state.orderRefundComplete)
  const { loading: loadingRefundComplete, error: errorRefundComplete, success: successRefundComplete } = orderRefundComplete

  const orderAdminDelete = useSelector((state) => state.orderAdminDelete)
  const { loading: loadingDelete, success: successDelete } = orderAdminDelete

  // ── MỚI (B1): Admin mở khóa COD thủ công cho khách ──
  const userUnlockCod = useSelector((state) => state.userUnlockCod)
  const { loading: loadingUnlockCod, success: successUnlockCod, error: errorUnlockCod } = userUnlockCod

  // MỚI: Admin đánh dấu đã thu/chưa thu tiền cho đơn COD
  const orderCodPayment = useSelector((state) => state.orderCodPayment)
  const { loading: loadingCodPayment, success: successCodPayment, error: errorCodPayment } = orderCodPayment

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [showConfirmDeleteOrder, setShowConfirmDeleteOrder] = useState(false)

  // ── MỚI (A5): form yêu cầu hoàn tiền (khách) ──────────────────
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundBankName, setRefundBankName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundAccountHolder, setRefundAccountHolder] = useState('')
  const [refundReason, setRefundReason] = useState('')

  // ── MỚI (A5): form Admin xác nhận đã hoàn tiền ────────────────
  const [refundCompleteAmount, setRefundCompleteAmount] = useState('')
  const [refundCompleteNote, setRefundCompleteNote] = useState('')

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
      return
    }

    if (successApproveCancel || successRejectCancel || successDeliver || successCancelReq || successDelete || successRefundReq || successRefundComplete) {
      dispatch({ type: ORDER_PAY_RESET })
      dispatch({ type: ORDER_DELIVER_RESET })
      dispatch({ type: ORDER_CANCEL_REQUEST_RESET })
      dispatch({ type: ORDER_APPROVE_CANCEL_RESET })
      dispatch({ type: ORDER_REJECT_CANCEL_RESET })
      dispatch({ type: ORDER_REFUND_REQUEST_RESET })
      dispatch({ type: ORDER_REFUND_COMPLETE_RESET })

      if (successDelete) {
        dispatch({ type: 'ORDER_ADMIN_DELETE_RESET' })
        history.push('/admin/orderlist')
        return
      }

      dispatch({ type: 'ORDER_ADMIN_DELETE_RESET' })
      dispatch(getOrderDetails(orderId))
      return
    }

    if (!orderIdInState || orderIdInState !== orderId) {
      dispatch(getOrderDetails(orderId))
    }
  }, [
    dispatch, orderId, history, userInfo, orderIdInState,
    successDeliver, successCancelReq, successApproveCancel, successRejectCancel, successDelete,
    successRefundReq, successRefundComplete,
  ])

  // ── MỚI (B1): sau khi Admin mở khóa COD thành công, làm mới lại đơn hàng ──
  useEffect(() => {
    if (successUnlockCod) {
      dispatch({ type: USER_UNLOCK_COD_RESET })
      dispatch(getOrderDetails(orderId))
    }
  }, [dispatch, successUnlockCod, orderId])

  // ── MỚI: sau khi Admin đổi trạng thái thanh toán COD thành công, làm mới lại đơn hàng ──
  useEffect(() => {
    if (successCodPayment) {
      dispatch({ type: ORDER_COD_PAYMENT_RESET })
      dispatch(getOrderDetails(orderId))
    }
  }, [dispatch, successCodPayment, orderId])

  const deliverHandler = () => {
    if (window.confirm('Xác nhận đã giao hàng?')) dispatch(deliverOrder(order))
  }

  const submitCancelHandler = (e) => {
    e.preventDefault()
    if (window.confirm('Bạn chắc chắn muốn yêu cầu hủy đơn hàng này?')) {
      dispatch(cancelOrderRequest(orderId, cancelReason))
    }
  }

  const approveHandler = () => {
    if (window.confirm('Duyệt yêu cầu hủy đơn này?')) dispatch(approveCancelOrder(orderId))
  }

  const rejectHandler = () => {
    if (window.confirm('Từ chối yêu cầu hủy đơn này?')) dispatch(rejectCancelOrder(orderId))
  }

  // ── MỚI (B1): Admin mở khóa COD thủ công cho khách hàng ──
  const unlockCodHandler = () => {
    if (order?.user?._id && window.confirm(`Mở khóa COD cho khách hàng "${order.user.name}"?`)) {
      dispatch(unlockCod(order.user._id))
    }
  }

  // ── MỚI: Admin đánh dấu đã thu/chưa thu tiền cho đơn COD ──
  const toggleCodPaymentHandler = () => {
    const nextIsPaid = !order.isPaid
    const confirmMsg = nextIsPaid
      ? 'Xác nhận Đã thu tiền mặt cho đơn hàng này?'
      : 'Xác nhận đánh dấu đơn hàng này là CHƯA thu tiền?'
    if (window.confirm(confirmMsg)) {
      dispatch(updateCodPaymentStatus(orderId, nextIsPaid))
    }
  }

  // ── MỚI (A5): khách gửi yêu cầu hoàn tiền ─────────────────────
  const submitRefundHandler = (e) => {
    e.preventDefault()
    if (!refundBankName.trim() || !refundAccountNumber.trim() || !refundAccountHolder.trim()) {
      window.alert('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng')
      return
    }
    if (window.confirm('Xác nhận gửi yêu cầu hoàn tiền với thông tin tài khoản trên?')) {
      dispatch(requestRefund(orderId, {
        bankName: refundBankName.trim(),
        accountNumber: refundAccountNumber.trim(),
        accountHolder: refundAccountHolder.trim(),
        reason: refundReason.trim(),
      }))
    }
  }

  // ── MỚI (A5): Admin xác nhận đã hoàn tiền ─────────────────────
  const completeRefundHandler = () => {
    const amount = Number(refundCompleteAmount) || order.totalPrice
    if (window.confirm(`Xác nhận ĐÃ chuyển khoản hoàn tiền ${amount.toLocaleString('vi-VN')}đ cho khách?`)) {
      dispatch(completeRefund(orderId, amount, refundCompleteNote.trim()))
    }
  }

  if (loading) return <Loader />
  if (error) return <Message variant='danger'>{error}</Message>
  if (!order) return null

  const isOwner = userInfo && order.user &&
    userInfo._id === (order.user._id || order.user).toString()

  const hasTracking = !!(order.ghnOrderCode || order.shippingTrackingId)

  // Hiện QR nếu: chọn online, chưa thanh toán, chưa hủy, có transferContent
  const showQR = order.paymentMethod === 'online'
    && !order.isPaid
    && !order.isCancelled
    && !!order.transferContent

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link to='/myorders' style={{
          color: '#33FFCC', textDecoration: 'none',
          border: '1px solid #33FFCC', borderRadius: '8px',
          padding: '6px 16px', fontSize: '14px',
        }}>
          <i className='fas fa-arrow-left me-2'></i>Đơn của tôi
        </Link>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.4rem' }}>
          <i className='fas fa-receipt me-2' style={{ color: '#33FFCC' }}></i>
          Chi tiết đơn hàng
        </h2>
        <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: 'auto' }}>#{order._id}</span>
      </div>

      <div style={{ ...sectionStyle, padding: '16px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#b8bcc8', fontSize: '13px', marginRight: '4px' }}>Trạng thái:</span>
        {(() => {
          const statusInfo = getOrderStatusInfo(order)
          return (
            <StatusBadge color={statusInfo.color}>
              <i className={statusInfo.icon}></i> {statusInfo.label}
            </StatusBadge>
          )
        })()}
        {order.isPaid ? (
          <StatusBadge color='#4cdb80'><i className='fas fa-check-circle'></i> Đã thanh toán</StatusBadge>
        ) : (
          <StatusBadge color='#ff6b6b'><i className='fas fa-clock'></i> Chưa thanh toán</StatusBadge>
        )}
        {/* MỚI: chỉ hiện đếm ngược khi thanh toán online, chưa trả tiền, và đơn chưa bị hủy */}
        {order.paymentMethod === 'online' && !order.isPaid && !order.isCancelled && (
          <AutoCancelStatusBadge createdAt={order.createdAt} />
        )}
        {order.cancelRequest?.requested && !order.isCancelled && (
          <StatusBadge color='#ffd166'><i className='fas fa-hourglass-half'></i> Đang chờ duyệt hủy</StatusBadge>
        )}
        {order.ghnOrderCode && (
          <StatusBadge color='#33FFCC'>
            <i className='fas fa-shipping-fast'></i> GHN: {order.ghnOrderCode}
          </StatusBadge>
        )}
      </div>

      {/* A3: Timeline trạng thái chi tiết + Admin cập nhật thủ công */}
      <OrderTimeline order={order} isAdmin={!!userInfo?.isAdmin} />

      <Row className='g-4'>
        <Col lg={8}>
          {/* ĐỊA CHỈ */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-map-marker-alt me-2'></i>Địa chỉ giao hàng
            </h5>
            <div style={{ background: 'rgba(51,255,204,0.06)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,255,204,0.2)' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={labelStyle}>Họ tên</div>
                  <div style={valueStyle}>{order.shippingAddress.fullName || order.user?.name}</div>
                </div>
                <div>
                  <div style={labelStyle}>Số điện thoại</div>
                  <div style={valueStyle}>{order.shippingAddress.phone || '—'}</div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={labelStyle}>Địa chỉ</div>
                  <div style={valueStyle}>
                    {[order.shippingAddress.detail, order.shippingAddress.ward, order.shippingAddress.province].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
              </div>
              {order.isCancelled && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,107,107,0.1)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)' }}>
                  <span style={{ color: '#ff6b6b', fontSize: '13px' }}>
                    <i className='fas fa-times-circle me-2'></i>
                    Hủy lúc {order.cancelledAt?.substring(0, 10)} — Lý do: {order.cancelReason || 'Không có lý do'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SẢN PHẨM */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-box me-2'></i>Sản phẩm ({order.orderItems.length})
            </h5>
            {order.orderItems.map((item, index) => (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0',
                borderBottom: index < order.orderItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <img src={item.image} alt={item.name} style={{
                  width: '70px', height: '70px', objectFit: 'contain',
                  background: '#0f0f23', borderRadius: '10px', padding: '6px',
                  border: '1px solid rgba(51,255,204,0.15)', flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <Link to={`/product/${item.product}`} style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
                    {item.name}
                  </Link>
                  {item.color && <div style={{ color: '#b8bcc8', fontSize: '12px', marginTop: '2px' }}>Màu: {item.color}</div>}
                  <div style={{ color: '#b8bcc8', fontSize: '13px', marginTop: '2px' }}>x{item.qty}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#33FFCC', fontWeight: '700', fontSize: '15px' }}>{(item.qty * item.price).toLocaleString('vi-VN')}đ</div>
                  <div style={{ color: '#b8bcc8', fontSize: '12px' }}>{item.price.toLocaleString('vi-VN')}đ / cái</div>
                </div>
              </div>
            ))}
          </div>

          {/* THANH TOÁN */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-credit-card me-2'></i>Phương thức thanh toán
            </h5>
            <div style={{ background: 'rgba(51,255,204,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(51,255,204,0.2)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <i className={PAYMENT_ICONS[order.paymentMethod] || 'fas fa-credit-card'} style={{ color: '#33FFCC', fontSize: '18px', width: '24px' }}></i>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              {order.shippingProvider && (
                <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: '8px' }}>
                  qua {carrierLabel(order.shippingProvider)}
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {order.isPaid
                  ? <StatusBadge color='#4cdb80'><i className='fas fa-check'></i> Đã TT {order.paidAt?.substring(0, 10)}</StatusBadge>
                  : <StatusBadge color='#ffd166'><i className='fas fa-clock'></i> Chưa thanh toán</StatusBadge>}

                {/* MỚI: Admin đánh dấu đã thu/chưa thu tiền — chỉ áp dụng cho đơn COD */}
                {userInfo?.isAdmin && order.paymentMethod === 'cod' && (
                  <button
                    onClick={toggleCodPaymentHandler}
                    disabled={loadingCodPayment}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${order.isPaid ? 'rgba(255,209,102,0.5)' : 'rgba(76,219,128,0.5)'}`,
                      color: order.isPaid ? '#ffd166' : '#4cdb80',
                      borderRadius: '8px', padding: '5px 12px', fontSize: '12.5px', fontWeight: '600',
                      cursor: loadingCodPayment ? 'not-allowed' : 'pointer',
                      opacity: loadingCodPayment ? 0.6 : 1, whiteSpace: 'nowrap',
                    }}
                  >
                    {loadingCodPayment
                      ? <><i className='fas fa-spinner fa-spin me-1'></i>Đang lưu...</>
                      : order.isPaid
                        ? <><i className='fas fa-undo me-1'></i> Đánh dấu chưa thu tiền</>
                        : <><i className='fas fa-hand-holding-usd me-1'></i> Đánh dấu đã thu tiền</>}
                  </button>
                )}
              </div>
            </div>
            {errorCodPayment && <div style={{ marginTop: '10px' }}><Message variant='danger'>{errorCodPayment}</Message></div>}
          </div>

          {/* ✅ QR SEPAY ĐỘNG — chỉ hiện khi chọn online, chưa TT, có transferContent */}
          {showQR && <SepayQRSection order={order} />}

          {/* Thông báo đã thanh toán thành công */}
          {order.paymentMethod === 'online' && order.isPaid && (
            <div style={{ ...sectionStyle, border: '1px solid rgba(76,219,128,0.4)', background: 'rgba(76,219,128,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className='fas fa-check-circle' style={{ color: '#4cdb80', fontSize: '28px' }}></i>
                <div>
                  <div style={{ color: '#4cdb80', fontWeight: '700', fontSize: '16px' }}>Thanh toán thành công!</div>
                  <div style={{ color: '#b8bcc8', fontSize: '13px', marginTop: '2px' }}>
                    Đã nhận tiền lúc {order.paidAt ? new Date(order.paidAt).toLocaleString('vi-VN') : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VẬN CHUYỂN */}
          {order.deliveryMethod && (
            <div style={sectionStyle}>
              <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
                <i className='fas fa-truck me-2'></i>Phương thức vận chuyển
              </h5>
              <div style={{ background: 'rgba(51,255,204,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(51,255,204,0.2)' }}>
                <span style={{ color: '#ffffff', fontWeight: '600' }}>
                  {carrierLabel(order.shippingProvider) || DELIVERY_LABELS[order.deliveryMethod] || order.deliveryMethod}
                  {order.shippingServiceName ? ` - ${order.shippingServiceName}` : ''}
                </span>
                {order.deliveryFee > 0 && (
                  <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: '12px' }}>
                    Phí: {order.deliveryFee?.toLocaleString('vi-VN')}đ
                  </span>
                )}
                {order.shippingEtaDate && (
                  <div style={{ color: '#b8bcc8', fontSize: '13px', marginTop: '6px' }}>
                    <i className='fas fa-calendar-check me-1' style={{ color: '#33FFCC' }}></i>
                    Dự kiến: {new Date(order.shippingEtaDate).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRACKING GHN */}
          {hasTracking && !order.isCancelled && (
            <TrackingSection orderId={orderId} />
          )}

          {/* LỜI NHẮN */}
          {order.shopMessage && (
            <div style={sectionStyle}>
              <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '12px' }}>
                <i className='fas fa-comment-dots me-2'></i>Lời nhắn
              </h5>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', color: '#b8bcc8', fontSize: '14px', fontStyle: 'italic' }}>
                "{order.shopMessage}"
              </div>
            </div>
          )}

          {/* HỦY ĐƠN - khách */}
          {!order.isPaid && !order.isDelivered && !order.isCancelled && !order.cancelRequest?.requested && isOwner && (
            <div style={sectionStyle}>
              <h5 style={{ color: '#ff6b6b', fontWeight: '700', marginBottom: '16px' }}>
                <i className='fas fa-ban me-2'></i>Hủy đơn hàng
              </h5>
              {!showCancelForm ? (
                <button onClick={() => setShowCancelForm(true)} style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  <i className='fas fa-times-circle me-2'></i> Yêu cầu hủy đơn
                </button>
              ) : (
                <div>
                  <input type='text' placeholder='Nhập lý do hủy đơn...' value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,107,107,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '12px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={submitCancelHandler} style={{ background: '#ff6b6b', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                      <i className='fas fa-paper-plane me-2'></i>Gửi yêu cầu
                    </button>
                    <button onClick={() => setShowCancelForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#b8bcc8', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MỚI (B1): HẠN CHẾ COD - Admin xem trạng thái & mở khóa thủ công ── */}
          {userInfo?.isAdmin && order.user?.codRestricted && (
            <div style={{ ...sectionStyle, border: '1px solid rgba(255,107,107,0.35)' }}>
              <h5 style={{ color: '#ff6b6b', fontWeight: '700', marginBottom: '16px' }}>
                <i className='fas fa-lock me-2'></i>Khách hàng đang bị hạn chế COD
              </h5>
              <p style={{ color: '#b8bcc8', fontSize: '14px', marginBottom: '12px' }}>
                Khách hàng <strong style={{ color: '#fff' }}>{order.user?.name}</strong> hiện có{' '}
                <strong style={{ color: '#ff6b6b' }}>{order.user?.codFailCount || 0}</strong> lần giao hàng thất bại
                và đang bị <strong>tạm khóa quyền thanh toán COD</strong> cho các đơn hàng mới. Hệ thống sẽ tự động
                mở lại khi khách nhận thành công đơn tiếp theo, hoặc bạn có thể mở khóa thủ công bên dưới nếu khách
                đã giải trình hợp lý.
              </p>
              {errorUnlockCod && <Message variant='danger'>{errorUnlockCod}</Message>}
              <button
                onClick={unlockCodHandler}
                disabled={loadingUnlockCod}
                style={{ background: '#33FFCC', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#0f0f23', fontWeight: '700', fontSize: '14px', cursor: loadingUnlockCod ? 'not-allowed' : 'pointer', opacity: loadingUnlockCod ? 0.6 : 1 }}
              >
                <i className='fas fa-unlock me-2'></i>{loadingUnlockCod ? 'Đang mở khóa...' : 'Mở khóa COD'}
              </button>
            </div>
          )}

          {/* DUYỆT HỦY - admin */}
          {userInfo?.isAdmin && order.cancelRequest?.requested && !order.isCancelled && (
            <div style={{ ...sectionStyle, border: '1px solid rgba(255,209,102,0.3)' }}>
              <h5 style={{ color: '#ffd166', fontWeight: '700', marginBottom: '16px' }}>
                <i className='fas fa-exclamation-triangle me-2'></i>Yêu cầu hủy đơn
              </h5>
              <div style={{ background: 'rgba(255,209,102,0.08)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(255,209,102,0.2)' }}>
                <div style={labelStyle}>Lý do khách hủy</div>
                <div style={{ color: '#ffffff', fontSize: '14px', marginTop: '4px' }}>{order.cancelRequest.reason || 'Không có lý do'}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={approveHandler} style={{ background: '#ff6b6b', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  <i className='fas fa-check me-2'></i>Duyệt hủy
                </button>
                <button onClick={rejectHandler} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#b8bcc8', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>
                  <i className='fas fa-times me-2'></i>Từ chối
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ A5: HOÀN TIỀN KHI GIAO HÀNG THẤT BẠI ═══════════ */}

          {/* Badge trạng thái hoàn tiền — hiện cho cả khách & admin khi đã có yêu cầu */}
          {order.refundStatus && order.refundStatus !== 'none' && (
            <div style={{
              ...sectionStyle,
              border: `1px solid ${order.refundStatus === 'completed' ? 'rgba(76,219,128,0.35)' : order.refundStatus === 'rejected' ? 'rgba(255,107,107,0.35)' : 'rgba(255,209,102,0.35)'}`,
            }}>
              <h5 style={{
                color: order.refundStatus === 'completed' ? '#4cdb80' : order.refundStatus === 'rejected' ? '#ff6b6b' : '#ffd166',
                fontWeight: '700', marginBottom: '12px',
              }}>
                <i className={`fas ${order.refundStatus === 'completed' ? 'fa-check-circle' : order.refundStatus === 'rejected' ? 'fa-times-circle' : 'fa-hourglass-half'} me-2`}></i>
                {order.refundStatus === 'completed' ? 'Đã hoàn tiền' : order.refundStatus === 'rejected' ? 'Yêu cầu hoàn tiền bị từ chối' : 'Đang chờ xử lý hoàn tiền'}
              </h5>

              {order.refundStatus === 'completed' && (
                <div style={{ color: '#b8bcc8', fontSize: '14px' }}>
                  Số tiền: <strong style={{ color: '#4cdb80' }}>{Number(order.refundAmount).toLocaleString('vi-VN')}đ</strong>
                  <br />Thời gian: {order.refundAt ? new Date(order.refundAt).toLocaleString('vi-VN') : ''}
                  {order.refundNote && <><br />Ghi chú: {order.refundNote}</>}
                </div>
              )}

              {order.refundStatus === 'requested' && (
                <div style={{ color: '#b8bcc8', fontSize: '14px' }}>
                  Yêu cầu gửi lúc: {order.refundRequestedAt ? new Date(order.refundRequestedAt).toLocaleString('vi-VN') : ''}
                  {order.refundReason && <><br />Lý do: {order.refundReason}</>}
                </div>
              )}

              {/* Admin: xem thông tin ngân hàng + xác nhận đã hoàn tiền */}
              {userInfo?.isAdmin && order.refundStatus === 'requested' && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ background: 'rgba(255,209,102,0.08)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', border: '1px solid rgba(255,209,102,0.2)' }}>
                    <div style={labelStyle}>Thông tin tài khoản ngân hàng của khách</div>
                    <div style={{ color: '#ffffff', fontSize: '14px', marginTop: '6px', lineHeight: 1.6 }}>
                      Ngân hàng: <strong>{order.refundBankInfo?.bankName}</strong><br />
                      Số tài khoản: <strong>{order.refundBankInfo?.accountNumber}</strong><br />
                      Chủ tài khoản: <strong>{order.refundBankInfo?.accountHolder}</strong>
                    </div>
                  </div>

                  {errorRefundComplete && <Message variant='danger'>{errorRefundComplete}</Message>}

                  <input
                    type='number' placeholder={`Số tiền hoàn (mặc định ${order.totalPrice?.toLocaleString('vi-VN')}đ)`}
                    value={refundCompleteAmount} onChange={(e) => setRefundCompleteAmount(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '10px' }}
                  />
                  <input
                    type='text' placeholder='Ghi chú (không bắt buộc)'
                    value={refundCompleteNote} onChange={(e) => setRefundCompleteNote(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '12px' }}
                  />
                  <button
                    onClick={completeRefundHandler} disabled={loadingRefundComplete}
                    style={{ background: '#4cdb80', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#0f0f23', fontWeight: '700', fontSize: '14px', cursor: loadingRefundComplete ? 'not-allowed' : 'pointer', opacity: loadingRefundComplete ? 0.7 : 1 }}
                  >
                    <i className='fas fa-check-double me-2'></i>{loadingRefundComplete ? 'Đang lưu...' : 'Xác nhận đã hoàn tiền'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Khách: nút yêu cầu hoàn tiền — chỉ hiện khi đủ điều kiện và chưa gửi yêu cầu */}
          {isOwner && order.isPaid && ['delivery_failed', 'returned'].includes(order.status) &&
            (!order.refundStatus || order.refundStatus === 'none') && (
            <div style={sectionStyle}>
              <h5 style={{ color: '#ffd166', fontWeight: '700', marginBottom: '16px' }}>
                <i className='fas fa-hand-holding-usd me-2'></i>Yêu cầu hoàn tiền
              </h5>
              <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '14px' }}>
                Đơn hàng đã thanh toán nhưng {order.status === 'delivery_failed' ? 'giao hàng không thành công' : 'hàng đã được hoàn về kho'}.
                Vui lòng cung cấp thông tin tài khoản ngân hàng để nhận lại tiền.
              </div>

              {!showRefundForm ? (
                <button onClick={() => setShowRefundForm(true)} style={{ background: 'transparent', border: '1px solid #ffd166', color: '#ffd166', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  <i className='fas fa-hand-holding-usd me-2'></i> Yêu cầu hoàn tiền
                </button>
              ) : (
                <div>
                  {errorRefundReq && <Message variant='danger'>{errorRefundReq}</Message>}
                  <input type='text' placeholder='Tên ngân hàng (VD: Vietcombank)' value={refundBankName}
                    onChange={(e) => setRefundBankName(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '10px' }} />
                  <input type='text' placeholder='Số tài khoản' value={refundAccountNumber}
                    onChange={(e) => setRefundAccountNumber(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '10px' }} />
                  <input type='text' placeholder='Chủ tài khoản' value={refundAccountHolder}
                    onChange={(e) => setRefundAccountHolder(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '10px' }} />
                  <input type='text' placeholder='Lý do / ghi chú thêm (không bắt buộc)' value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid rgba(255,209,102,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '12px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={submitRefundHandler} disabled={loadingRefundReq} style={{ background: '#ffd166', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#0f0f23', fontWeight: '700', fontSize: '14px', cursor: loadingRefundReq ? 'not-allowed' : 'pointer', opacity: loadingRefundReq ? 0.7 : 1 }}>
                      <i className='fas fa-paper-plane me-2'></i>{loadingRefundReq ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                    <button onClick={() => setShowRefundForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#b8bcc8', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Col>

        {/* CỘT PHẢI */}
        <Col lg={4}>
          <div style={{ background: '#1a1a2e', borderRadius: '16px', border: '1px solid rgba(51,255,204,0.35)', padding: '24px', position: 'sticky', top: '100px' }}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '20px' }}>
              <i className='fas fa-calculator me-2'></i>Chi tiết thanh toán
            </h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Tổng tiền hàng</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>
                {order.orderItems.reduce((acc, item) => acc + (item.price * item.qty), 0).toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Phí vận chuyển</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{(order.deliveryFee || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            {order.voucherDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Giảm giá {order.voucherCode && `(${order.voucherCode})`}</span>
                <span style={{ color: '#4cdb80', fontWeight: '600' }}>-{order.voucherDiscount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }}></div>
            <div style={{ background: 'rgba(51,255,204,0.08)', border: '2px solid #33FFCC', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '4px' }}>Tổng thanh toán</div>
              <div style={{ color: '#33FFCC', fontSize: '1.8rem', fontWeight: '700' }}>{order.totalPrice?.toLocaleString('vi-VN')}đ</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#b8bcc8', fontSize: '13px' }}>Ngày đặt</span>
                <span style={{ color: '#ffffff', fontSize: '13px' }}>{order.createdAt?.substring(0, 10)}</span>
              </div>
              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#b8bcc8', fontSize: '13px' }}>Ngày thanh toán</span>
                  <span style={{ color: '#4cdb80', fontSize: '13px' }}>{order.paidAt?.substring(0, 10)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#b8bcc8', fontSize: '13px' }}>Ngày giao hàng</span>
                  <span style={{ color: '#4cdb80', fontSize: '13px' }}>{order.deliveredAt?.substring(0, 10)}</span>
                </div>
              )}
            </div>

            {userInfo?.isAdmin && !order.isPaid && (
              <button
                onClick={() => setShowConfirmDeleteOrder(true)}
                disabled={loadingDelete}
                style={{
                  width: '100%', background: '#ff6b6b', border: 'none', borderRadius: '12px',
                  padding: '14px', color: '#fff', fontWeight: '700', fontSize: '15px',
                  cursor: loadingDelete ? 'not-allowed' : 'pointer',
                  opacity: loadingDelete ? 0.7 : 1, marginBottom: '12px',
                }}
              >
                {loadingDelete
                  ? <><i className='fas fa-spinner fa-spin me-2'></i>Đang xoá...</>
                  : <><i className='fas fa-trash me-2'></i>Xoá đơn hàng</>}
              </button>
            )}

            <ConfirmDeleteModal
              show={showConfirmDeleteOrder}
              title={'Xoá đơn hàng này?'}
              confirmText={'Xoá'}
              cancelText={'Huỷ'}
              onCancel={() => setShowConfirmDeleteOrder(false)}
              onConfirm={() => {
                setShowConfirmDeleteOrder(false)
                dispatch(deleteOrderByAdmin(orderId))
              }}
            />

            {userInfo?.isAdmin && order.isPaid && !order.isDelivered && !order.isCancelled && (
              <button onClick={deliverHandler} disabled={loadingDeliver} style={{
                width: '100%', background: '#33FFCC', border: 'none', borderRadius: '12px', padding: '14px',
                color: '#0f0f23', fontWeight: '700', fontSize: '15px',
                cursor: loadingDeliver ? 'not-allowed' : 'pointer', opacity: loadingDeliver ? 0.7 : 1,
              }}>
                {loadingDeliver
                  ? <><i className='fas fa-spinner fa-spin me-2'></i>Đang xử lý...</>
                  : <><i className='fas fa-truck me-2'></i>Đánh dấu đã giao hàng</>}
              </button>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default OrderScreen