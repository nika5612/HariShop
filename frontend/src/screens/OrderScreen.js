import React, { useState, useEffect, useRef } from 'react'
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
} from '../actions/orderActions'
import { deleteOrderByAdmin } from '../actions/orderAdminActions'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

import {
  ORDER_PAY_RESET,
  ORDER_DELIVER_RESET,
  ORDER_CANCEL_REQUEST_RESET,
  ORDER_APPROVE_CANCEL_RESET,
  ORDER_REJECT_CANCEL_RESET,
  ORDER_TRACK_RESET,
} from '../constants/orderConstants'

const SEPAY_BANK_ID  = 'VCB'
const SEPAY_ACCOUNT  = '0000000001'

const SEPAY_TEMPLATE = 'compact2'

const buildVietQRUrl = (amount, content) =>
  `https://img.vietqr.io/image/${SEPAY_BANK_ID}-${SEPAY_ACCOUNT}-${SEPAY_TEMPLATE}.png` +
  `?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=HARISHOP`
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

  const orderAdminDelete = useSelector((state) => state.orderAdminDelete)
  const { loading: loadingDelete, success: successDelete } = orderAdminDelete

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [showConfirmDeleteOrder, setShowConfirmDeleteOrder] = useState(false)

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
      return
    }

    if (successApproveCancel || successRejectCancel || successDeliver || successCancelReq || successDelete) {
      dispatch({ type: ORDER_PAY_RESET })
      dispatch({ type: ORDER_DELIVER_RESET })
      dispatch({ type: ORDER_CANCEL_REQUEST_RESET })
      dispatch({ type: ORDER_APPROVE_CANCEL_RESET })
      dispatch({ type: ORDER_REJECT_CANCEL_RESET })

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
  ])

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
        {order.isCancelled ? (
          <StatusBadge color='#ff6b6b'><i className='fas fa-times-circle'></i> Đã hủy</StatusBadge>
        ) : order.isDelivered ? (
          <StatusBadge color='#4cdb80'><i className='fas fa-check-circle'></i> Đã giao hàng</StatusBadge>
        ) : (
          <StatusBadge color='#ffd166'><i className='fas fa-truck'></i> Đang giao</StatusBadge>
        )}
        {order.isPaid ? (
          <StatusBadge color='#4cdb80'><i className='fas fa-check-circle'></i> Đã thanh toán</StatusBadge>
        ) : (
          <StatusBadge color='#ff6b6b'><i className='fas fa-clock'></i> Chưa thanh toán</StatusBadge>
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
            <div style={{ background: 'rgba(51,255,204,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(51,255,204,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className={PAYMENT_ICONS[order.paymentMethod] || 'fas fa-credit-card'} style={{ color: '#33FFCC', fontSize: '18px', width: '24px' }}></i>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              {order.shippingProvider && (
                <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: '8px' }}>
                  qua {carrierLabel(order.shippingProvider)}
                </span>
              )}
              <div style={{ marginLeft: 'auto' }}>
                {order.isPaid
                  ? <StatusBadge color='#4cdb80'><i className='fas fa-check'></i> Đã TT {order.paidAt?.substring(0, 10)}</StatusBadge>
                  : <StatusBadge color='#ffd166'><i className='fas fa-clock'></i> Chưa thanh toán</StatusBadge>}
              </div>
            </div>
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