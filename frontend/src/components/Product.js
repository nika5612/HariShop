import React from 'react'
import { Link } from 'react-router-dom'
import Rating from './Rating'

const formatVnd = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString('vi-VN')
}

const Product = ({ product }) => {
  if (!product) return null

  const { _id, name, image, price, rating, numReviews, countInStock } = product

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid rgba(51,255,204,0.15)',
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
          <h4 style={{
            color: '#33FFCC',
            margin: '0 0 4px 0',
            fontWeight: '800',
            fontSize: '1.25rem',
          }}>
            {formatVnd(price)}đ
          </h4>
        ) : null}

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