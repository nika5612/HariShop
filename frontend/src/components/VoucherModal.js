import React, { useState, useEffect } from 'react'
import { Modal } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { listAvailableVouchers, validateVoucherCode } from '../actions/voucherActions'

const VoucherModal = ({ show, onHide, orderAmount, shippingFee = 0, categories = [], selectedCode, onConfirm }) => {
  const dispatch = useDispatch()

  const voucherAvailableList = useSelector((state) => state.voucherAvailableList)
  const { loading, vouchers = [] } = voucherAvailableList

  const [manualCode, setManualCode] = useState('')
  const [manualError, setManualError] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [pickedCode, setPickedCode] = useState(selectedCode || null)

  useEffect(() => {
    if (show) {
      dispatch(listAvailableVouchers({ orderAmount, shippingFee, categories }))
      setPickedCode(selectedCode || null)
      setManualCode('')
      setManualError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  // Voucher đang chọn tay qua mã nhập (không có trong danh sách card) vẫn
  // cần hiển thị 1 dòng "đã áp dụng" riêng — Shopee cũng xử lý tương tự.
  const handlePickCard = (voucher) => {
    if (voucher.eligible === false) return
    setPickedCode((prev) => (prev === voucher.code ? null : voucher.code))
  }

  const handleApplyManualCode = async () => {
    const code = manualCode.trim().toUpperCase()
    if (!code) {
      setManualError('Vui lòng nhập mã voucher')
      return
    }
    setManualLoading(true)
    setManualError('')
    try {
      const result = await dispatch(
        validateVoucherCode({ code, orderAmount, shippingFee, categories })
      )
      setPickedCode(result.code)
      // Refresh lại danh sách để card tương ứng (nếu có) hiện đúng trạng thái "Đã chọn"
      dispatch(listAvailableVouchers({ orderAmount, shippingFee, categories }))
    } catch (err) {
      setManualError(err.message || 'Mã voucher không hợp lệ')
    } finally {
      setManualLoading(false)
    }
  }

  // Gợi ý "Tiết kiệm nhất": voucher khả dụng có discountAmount cao nhất
  const eligibleVouchers = vouchers.filter((v) => v.eligible !== false)
  const bestVoucherCode = eligibleVouchers.length
    ? eligibleVouchers.reduce((best, v) =>
        Number(v.discountAmount) > Number(best.discountAmount) ? v : best
      ).code
    : null

  // Voucher đang chọn luôn lên đầu, sau đó khả dụng (giảm nhiều trước), cuối cùng không khả dụng
  const sortedVouchers = [...vouchers].sort((a, b) => {
    if (a.code === pickedCode) return -1
    if (b.code === pickedCode) return 1
    if (a.eligible !== b.eligible) return a.eligible === false ? 1 : -1
    return Number(b.discountAmount) - Number(a.discountAmount)
  })

  const typeLabel = (v) => {
    if (v.type === 'freeship') return 'Freeship'
    if (v.type === 'percent') return `Giảm ${v.value}%`
    return `Giảm ${Number(v.value).toLocaleString('vi-VN')}đ`
  }

  const handleConfirm = () => {
    const chosen = vouchers.find((v) => v.code === pickedCode)
    onConfirm(chosen || (pickedCode ? { code: pickedCode } : null))
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} centered scrollable contentClassName='voucher-modal-content'>
      <Modal.Header
        closeButton
        style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(51,255,204,0.2)' }}
      >
        <Modal.Title style={{ color: '#33FFCC', fontWeight: 700, fontSize: '1.1rem' }}>
          <i className='fas fa-ticket-alt me-2'></i>Voucher của HariShop
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ background: '#1a1a2e', maxHeight: '65vh', overflowY: 'auto' }}>
        {/* Thanh nhập mã */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            type='text'
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder='Nhập mã voucher'
            style={{
              flex: 1, background: '#0f0f23', border: '1px solid rgba(51,255,204,0.4)',
              borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={handleApplyManualCode}
            disabled={manualLoading}
            style={{
              background: '#33FFCC', border: 'none', borderRadius: 8, padding: '10px 20px',
              color: '#0f0f23', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0,
              opacity: manualLoading ? 0.6 : 1,
            }}
          >
            {manualLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
          </button>
        </div>
        {manualError && (
          <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: -10, marginBottom: 14 }}>{manualError}</div>
        )}

        {/* Danh sách voucher */}
        {loading ? (
          <div style={{ color: '#b8bcc8', textAlign: 'center', padding: 20 }}>Đang tải voucher...</div>
        ) : sortedVouchers.length === 0 ? (
          <div style={{ color: '#b8bcc8', textAlign: 'center', padding: 20 }}>Hiện chưa có voucher nào</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedVouchers.map((v) => {
              const isEligible = v.eligible !== false
              const isPicked = pickedCode === v.code
              const isBest = v.code === bestVoucherCode && isEligible

              return (
                <div
                  key={v._id || v.code}
                  onClick={() => handlePickCard(v)}
                  style={{
                    position: 'relative',
                    border: isPicked ? '2px solid #33FFCC' : '1px solid rgba(255,255,255,0.12)',
                    background: isEligible ? 'rgba(51,255,204,0.06)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: isEligible ? 'pointer' : 'not-allowed',
                    opacity: isEligible ? 1 : 0.5,
                    transition: 'border-color .15s, transform .1s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => { if (isEligible) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    {isBest && (
                      <span style={{
                        display: 'inline-block', background: '#ffb020', color: '#0f0f23',
                        fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '1px 8px', marginBottom: 6,
                      }}>
                        🔥 Tiết kiệm nhất
                      </span>
                    )}
                    <div style={{ color: isEligible ? '#33FFCC' : '#8c93a6', fontWeight: 700, fontSize: 15 }}>
                      🏷 {v.name || v.code} — {typeLabel(v)}
                    </div>
                    <div style={{ color: '#b8bcc8', fontSize: 12.5, marginTop: 2 }}>
                      Cho đơn từ {Number(v.minOrder || 0).toLocaleString('vi-VN')}đ
                      {v.type === 'percent' && v.maxDiscount > 0 && (
                        <> · Giảm tối đa {Number(v.maxDiscount).toLocaleString('vi-VN')}đ</>
                      )}
                    </div>
                    <div style={{ color: '#8c93a6', fontSize: 12, marginTop: 2 }}>
                      HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                      {v.applicableCategories?.length > 0 && (
                        <> · Áp dụng: {v.applicableCategories.join(', ')}</>
                      )}
                      {(!v.applicableCategories || v.applicableCategories.length === 0) && (
                        <> · Áp dụng cho tất cả sản phẩm</>
                      )}
                    </div>
                    {!isEligible && v.reason && (
                      <div style={{ color: '#ff6b6b', fontSize: 12.5, marginTop: 6 }}>❌ {v.reason}</div>
                    )}
                  </div>

                  <button
                    disabled={!isEligible}
                    onClick={(e) => { e.stopPropagation(); handlePickCard(v) }}
                    style={{
                      flexShrink: 0,
                      border: isPicked ? 'none' : '1px solid #33FFCC',
                      background: isPicked ? '#33FFCC' : 'transparent',
                      color: isPicked ? '#0f0f23' : isEligible ? '#33FFCC' : '#8c93a6',
                      borderRadius: 8,
                      padding: '6px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isEligible ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isPicked ? '✔ Đã chọn' : 'Chọn'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ background: '#1a1a2e', borderTop: '1px solid rgba(51,255,204,0.2)' }}>
        <button
          onClick={onHide}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8, padding: '8px 20px', color: '#b8bcc8', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Hủy
        </button>
        <button
          onClick={handleConfirm}
          style={{
            background: '#33FFCC', border: 'none', borderRadius: 8, padding: '8px 22px',
            color: '#0f0f23', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Xác nhận
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default VoucherModal