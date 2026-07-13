import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Rating from './Rating'
import CountdownTimer from './CountdownTimer'
import { addToCompare, removeFromCompare } from '../actions/compareActions'
import { COMPARE_MAX_ITEMS } from '../constants/compareConstants'

const formatVnd = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString('vi-VN')
}

const Product = ({ product }) => {
  const dispatch = useDispatch()
  const compareItems = useSelector((state) => state.compare.compareItems)
  // MỚI (B8): khi đếm ngược về 0 ngay trên màn hình, ẩn ribbon/giá giảm NGAY LẬP TỨC
  // (không cần đợi tải lại trang mới cập nhật) — tự quay về hiển thị giá gốc.
  const [expired, setExpired] = useState(false)

  if (!product) return null

  const {
    _id, name, image, price, rating, numReviews, countInStock,
    isFlashSaleActive, discountPercent, salePrice, flashSaleEndsAt,
  } = product
  const flashSaleActive = isFlashSaleActive && !expired
  const isInCompare = compareItems.some((x) => x._id === _id)
  const compareFull = compareItems.length >= COMPARE_MAX_ITEMS

  const toggleCompare = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isInCompare) {
      dispatch(removeFromCompare(_id))
    } else {
      if (compareFull) return
      dispatch(addToCompare(product))
    }
  }

  return (
    <div style={{
      background: '#1a1a2e',
      border: flashSaleActive ? '1px solid rgba(255,107,107,0.35)' : '1px solid rgba(51,255,204,0.15)',
      borderRadius: '16px',
      overflow: 'hidden',
      height: '100%',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
    }} className="mb-4 h-100 fade-in-up">

      {/* ── Ảnh ── */}
      <Link to={`/product/${_id || ''}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          height: '220px',
          background: '#0f0f23',
        }}>
          {image ? (
            <img
              src={image}
              alt={name || 'Product'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s ease',
              }}
            />
          ) : null}

          {/* MỚI (B8): Ribbon Flash Sale — góc trái, chỉ hiện khi đang diễn ra */}
          {flashSaleActive && (
            <div style={{
              position: 'absolute', top: '14px', left: '-6px', zIndex: 2,
              background: 'linear-gradient(135deg, #ff6b6b, #e63946)',
              color: '#ffffff', fontWeight: '800', fontSize: '13px',
              padding: '5px 14px 5px 10px',
              clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
              boxShadow: '0 4px 10px rgba(230,57,70,0.4)',
            }}>
              Giảm {discountPercent}%
            </div>
          )}

          {/* Hot badge */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>
            <span style={{
              background: '#33FFCC',
              color: '#0f0f23',
              fontWeight: '700',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(51,255,204,0.3)',
            }}>
              Hot
            </span>
          </div>

          {/* MỚI (B7): nút So sánh — góc dưới-phải ảnh, tránh đè ribbon Flash Sale */}
          <button
            onClick={toggleCompare}
            title={isInCompare ? 'Bỏ khỏi so sánh' : compareFull ? `Chỉ so sánh tối đa ${COMPARE_MAX_ITEMS} sản phẩm` : 'Thêm vào so sánh'}
            disabled={!isInCompare && compareFull}
            style={{
              position: 'absolute', bottom: '12px', right: '12px', zIndex: 2,
              width: '32px', height: '32px', borderRadius: '50%',
              background: isInCompare ? '#33FFCC' : 'rgba(15,15,35,0.75)',
              border: `1px solid ${isInCompare ? '#33FFCC' : 'rgba(51,255,204,0.4)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (!isInCompare && compareFull) ? 'not-allowed' : 'pointer',
              opacity: (!isInCompare && compareFull) ? 0.5 : 1,
            }}
          >
            <i className='fas fa-balance-scale' style={{ color: isInCompare ? '#0f0f23' : '#33FFCC', fontSize: '13px' }}></i>
          </button>
        </div>
      </Link>

      {/* ── Body ── */}
      <div style={{
        padding: '1rem 1rem 1.2rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}>
        {/* Tên */}
        <Link to={`/product/${_id || ''}`} style={{ textDecoration: 'none', marginBottom: '8px' }}>
          <h5 style={{
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '1rem',
            margin: 0,
            lineHeight: '1.4',
          }}>
            {name}
          </h5>
        </Link>

        {/* Rating */}
        <div style={{ marginBottom: '10px' }}>
          <Rating value={rating || 0} text={`${numReviews || 0} đánh giá`} />
        </div>

        {/* Giá */}
        {typeof price !== 'undefined' ? (
          flashSaleActive ? (
            <div style={{ marginBottom: '4px' }}>
              <h4 style={{ color: '#ff6b6b', margin: 0, fontWeight: '800', fontSize: '1.25rem', lineHeight: 1.2 }}>
                {formatVnd(salePrice)}đ
              </h4>
              <span style={{
                color: '#6b7085', fontSize: '13px', textDecoration: 'line-through', display: 'block', marginTop: '2px',
              }}>
                {formatVnd(price)}đ
              </span>
            </div>
          ) : (
            <h4 style={{
              color: '#33FFCC',
              margin: '0 0 4px 0',
              fontWeight: '800',
              fontSize: '1.25rem',
            }}>
              {formatVnd(price)}đ
            </h4>
          )
        ) : null}

        {/* MỚI (B8): Đếm ngược Flash Sale */}
        {flashSaleActive && flashSaleEndsAt && (
          <div style={{ marginBottom: '4px' }}>
            <CountdownTimer endsAt={flashSaleEndsAt} onExpire={() => setExpired(true)} />
          </div>
        )}

        {/* Tồn kho */}
        {typeof countInStock !== 'undefined' ? (
          <div style={{ color: '#b8bcc8', fontSize: '12px', marginTop: '2px' }}>
            {countInStock > 0 ? `Còn ${countInStock} sản phẩm` : 'Tạm hết hàng'}
          </div>
        ) : null}

        {/* Spacer đẩy nút xuống đáy */}
        <div style={{ flex: 1 }} />

        {/* ── Nút Xem Chi Tiết — ở dưới cùng, full width ── */}
        <Link
          to={`/product/${_id || ''}`}
          style={{
            display: 'block',
            marginTop: '14px',
            background: 'linear-gradient(135deg, #33FFCC, #00D4AA)',
            color: '#0f0f23',
            fontWeight: '800',
            padding: '11px 0',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '14px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(51,255,204,0.25)',
            transition: 'all 0.25s ease',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(51,255,204,0.4)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(51,255,204,0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          Xem Chi Tiết
        </Link>
      </div>
    </div>
  )
}

export default Product