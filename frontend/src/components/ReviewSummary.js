import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getReviewSummary } from '../actions/productActions'

// ═══════════════════ B5: Tóm tắt & phân tích đánh giá bằng AI ═══════════════════
// Khi sản phẩm có đủ đánh giá (>=3), AI tự động tổng hợp ưu/nhược điểm kèm số lượt
// đề cập, giúp khách nắm nhanh mà không cần đọc hết từng đánh giá.

const chipStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: `${color}15`,
  border: `1px solid ${color}55`,
  color,
  borderRadius: '18px',
  padding: '2px 10px',
  fontSize: '11.5px',
  fontWeight: '700',
  marginLeft: '8px',
  whiteSpace: 'nowrap',
})

const ReviewSummary = ({ productId }) => {
  const dispatch = useDispatch()
  const productReviewSummary = useSelector((state) => state.productReviewSummary)
  const { loading, available, reason, minRequired, currentCount, summary, pros, cons, error, isSampled, sampleSize, reviewCount } = productReviewSummary

  useEffect(() => {
    if (productId) dispatch(getReviewSummary(productId))
  }, [dispatch, productId])

  if (loading) {
    return (
      <div style={{ color: '#8a8fa3', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className='fas fa-spinner fa-spin' style={{ color: '#33FFCC' }}></i>
        AI đang tổng hợp đánh giá...
      </div>
    )
  }

  // Chưa đủ đánh giá — im lặng bỏ qua, không hiện gì (không phải lỗi)
  if (!available && reason === 'not_enough_reviews') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
        borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
        color: '#8a8fa3', fontSize: '12.5px',
      }}>
        <i className='fas fa-info-circle me-2'></i>
        Cần thêm đánh giá để AI tổng hợp ưu/nhược điểm (hiện có {currentCount}/{minRequired}).
      </div>
    )
  }

  // Lỗi gọi AI (không phải do thiếu đánh giá) — ẩn lặng lẽ, không làm phiền khách
  if (!available || error) return null

  return (
    <div style={{
      background: 'rgba(51,255,204,0.05)', border: '1px solid rgba(51,255,204,0.25)',
      borderRadius: '14px', padding: '18px 20px', marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <i className='fas fa-robot' style={{ color: '#33FFCC' }}></i>
        <span style={{ color: '#33FFCC', fontWeight: '700', fontSize: '14px' }}>AI tổng hợp đánh giá</span>
      </div>

      {summary && (
        <p style={{ color: '#eef0f7', fontSize: '13.5px', marginBottom: '14px', lineHeight: 1.6 }}>
          {summary}
        </p>
      )}

      {Array.isArray(pros) && pros.length > 0 && (
        <div style={{ marginBottom: cons?.length > 0 ? '12px' : 0 }}>
          <div style={{ color: '#4cdb80', fontSize: '12.5px', fontWeight: '700', marginBottom: '8px' }}>
            ✅ Ưu điểm
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pros.map((p, idx) => (
              <div key={idx} style={{ color: '#eef0f7', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <span>{p.text}</span>
                {p.mentions > 0 && <span style={chipStyle('#4cdb80')}>{p.mentions} đề cập</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(cons) && cons.length > 0 && (
        <div>
          <div style={{ color: '#ffd166', fontSize: '12.5px', fontWeight: '700', marginBottom: '8px' }}>
            ⚠️ Hạn chế
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cons.map((c, idx) => (
              <div key={idx} style={{ color: '#eef0f7', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <span>{c.text}</span>
                {c.mentions > 0 && <span style={chipStyle('#ffd166')}>{c.mentions} đề cập</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {isSampled && (
        <div style={{ color: '#6b7085', fontSize: '11.5px', marginTop: '12px', fontStyle: 'italic' }}>
          * Tổng hợp dựa trên mẫu đại diện {sampleSize}/{reviewCount} đánh giá (chọn lọc cân bằng theo từng mức sao).
        </div>
      )}
    </div>
  )
}

export default ReviewSummary