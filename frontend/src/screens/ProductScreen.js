import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Button, Form } from 'react-bootstrap'
import Rating from '../components/Rating'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Meta from '../components/Meta'
import {
  listProductDetails,
  createProductReview,
  deleteProductReview,
} from '../actions/productActions'
import { PRODUCT_CREATE_REVIEW_RESET } from '../constants/productConstants'
import { addToCart } from '../actions/cartActions'

const ProductScreen = ({ history, match }) => {
  const [qty, setQty] = useState(1)
  const [color, setColor] = useState('')
  const [successAddToCart, setSuccessAddToCart] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  
  const colors = ['Đen', 'Trắng', 'Xanh dương', 'Bạc', 'Vàng', 'Đỏ']

  const dispatch = useDispatch()

  const productDetails = useSelector((state) => state.productDetails)
  const { loading, error, product } = productDetails

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const productReviewCreate = useSelector((state) => state.productReviewCreate)
  const {
    success: successProductReview,
    loading: loadingProductReview,
    error: errorProductReview,
  } = productReviewCreate

  useEffect(() => {
    if (successProductReview) {
      setRating(0)
      setComment('')
    }
    if (!product?._id || product._id !== match.params.id) {
      dispatch(listProductDetails(match.params.id))
      dispatch({ type: PRODUCT_CREATE_REVIEW_RESET })
    }
    // ── MỚI: set màu mặc định = màu đầu tiên khi product load ──
    if (product?.colors && product.colors.length > 0 && !color) {
      setColor(product.colors[0].name)
    }
  }, [dispatch, match, product?._id, successProductReview, product?.colors, color]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToCartHandler = () => {
    dispatch(addToCart(match.params.id, qty, color))
    setSuccessAddToCart(true)
    setTimeout(() => setSuccessAddToCart(false), 3000)
  }

  const buyNowHandler = () => {
    // Buy Now bypass cart: navigate with params
    const params = new URLSearchParams({
      buyNow: 'true',
      productId: match.params.id,
      qty: qty.toString(),
      color: color
    });
    history.push(`/checkout?${params.toString()}`);
  }

  const submitHandler = (e) => {
    e.preventDefault()
    dispatch(createProductReview(match.params.id, { rating, comment }))
  }

  const deleteReviewHandler = (reviewId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      dispatch(deleteProductReview(match.params.id, reviewId))
      dispatch(listProductDetails(match.params.id))
    }
  }

  const cardStyle = {
    background: '#1a1a2e',
    border: '1px solid rgba(51,255,204,0.15)',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
  }

  return (
    <>
      <Link
        to='/'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          marginBottom: '28px',
          borderRadius: '8px',
          border: '1px solid #33FFCC',
          color: '#33FFCC',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        <i className='fas fa-arrow-left'></i> Trở Về
      </Link>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          <Meta title={product.name} />

          {/* ===== PRODUCT DETAIL ===== */}
          <Row className='mb-4 g-4'>

            {/* Ảnh sản phẩm */}
            <Col md={5}>
              <div style={{ position: 'relative' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: '100%',
                    maxHeight: '420px',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(51,255,204,0.2)',
                    background: '#0f0f23',
                    padding: '24px',
                    border: '1px solid rgba(51,255,204,0.15)'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  background: '#33FFCC',
                  color: '#0f0f23',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}>
                  <i className='fas fa-crown me-1'></i> Chính hãng
                </span>
              </div>
            </Col>

            {/* Thông tin sản phẩm */}
            <Col md={4}>
              <div style={cardStyle}>
                <h2 style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.4rem', marginBottom: '16px', lineHeight: '1.5' }}>
                  {product.name}
                </h2>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '14px' }}>
                  <Rating value={product.rating} text={`${product.numReviews || 0} đánh giá`} />
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '14px' }}>
                  <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '4px' }}>Giá bán</div>
                  <span 
                    style={{ color: '#33FFCC', fontSize: '1.4rem', fontWeight: '700', wordBreak: 'break-all' }}
                  >
                    {product.price?.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div>
                  <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '8px' }}>Mô tả sản phẩm</div>
                  <p style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                    {product.description}
                  </p>
                </div>
              </div>
            </Col>

            {/* Card đặt hàng */}
            <Col md={3}>
              <div style={{ ...cardStyle, border: '1px solid rgba(51,255,204,0.35)', position: 'sticky', top: '100px', padding: '1.2rem 1.5rem' }}>
                <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px', fontSize: '1.1rem' }}>Đặt hàng</h5>

                {/* Giá */}
                <div style={{
                  background: 'rgba(51,255,204,0.08)',
                  border: '2px solid #33FFCC',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}>
                  <div style={{ color: '#b8bcc8', fontSize: '12px' }}>Giá bán</div>
                  <span 
                    style={{ color: '#33FFCC', fontSize: '1.1rem', fontWeight: '700', marginTop: '4px', display: 'block', wordBreak: 'break-all' }}
                  >
                    {product.price?.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {/* Trạng thái */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}>
                  <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Trạng thái</span>
                  <span style={{
                    background: (() => {
                      const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                      return s > 0 ? 'rgba(40,167,69,0.2)' : 'rgba(220,53,69,0.2)'
                    })(),
                    color: (() => {
                      const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                      return s > 0 ? '#4cdb80' : '#ff6b6b'
                    })(),
                    border: (() => {
                      const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                      return `1px solid ${s > 0 ? '#28a745' : '#dc3545'}`
                    })(),
                    padding: '3px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {(() => {
                      const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                      return s > 0 ? '✓ Còn hàng' : '✗ Hết hàng'
                    })()}
                  </span>
                </div>

                {/* Số lượng */}
                {/* MỚI: chỉ hiện dropdown qty khi màu đang chọn còn hàng */}
                {(() => {
                  const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                  return s > 0
                })() && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ color: '#b8bcc8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                      Số lượng
                    </label>
                    <Form.Control
                      as="select"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      style={{
                        background: '#0f0f23',
                        border: '1px solid #33FFCC',
                        color: '#ffffff',
                        borderRadius: '8px',
                        padding: '8px 10px',
                      }}
                    >
                      {/* MỚI: số lượng tối đa = stock của màu đang chọn */}
                      {[...Array(
                        (() => {
                          if (product.colors && product.colors.length > 0 && color) {
                            const sel = product.colors.find(c => c.name === color)
                            return sel ? sel.countInStock : 0
                          }
                          return product.countInStock
                        })()
                      ).keys()].map((x) => (
                        <option key={x + 1} value={x + 1} style={{ background: '#1a1a2e' }}>
                          {x + 1}
                        </option>
                      ))}
                    </Form.Control>
                  </div>
                )}

                {/* MỚI: Màu sắc từ product.colors */}
                {product.colors && product.colors.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ color: '#b8bcc8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                      Màu sắc
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {product.colors.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            if (c.countInStock > 0) setColor(c.name)
                          }}
                          disabled={c.countInStock === 0}
                          title={c.countInStock === 0 ? 'Hết hàng' : `Còn ${c.countInStock} cái`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '20px',
                            border: color === c.name
                              ? '2px solid #33FFCC'
                              : '2px solid rgba(255,255,255,0.2)',
                            background: color === c.name
                              ? 'rgba(51,255,204,0.12)'
                              : 'rgba(255,255,255,0.05)',
                            color: c.countInStock === 0 ? '#555' : '#eef0f7',
                            opacity: c.countInStock === 0 ? 0.5 : 1,
                            cursor: c.countInStock === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: color === c.name ? '700' : '400',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span style={{
                            width: 14, height: 14,
                            borderRadius: '50%',
                            background: c.hexCode || '#888',
                            border: '1px solid rgba(255,255,255,0.3)',
                            flexShrink: 0,
                            display: 'inline-block',
                          }} />
                          {c.name}
                          {c.countInStock === 0 && (
                            <span style={{ fontSize: '10px', color: '#ff6b6b' }}>(hết)</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Hiển thị stock của màu đang chọn */}
                    {color && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#b8bcc8' }}>
                        {(() => {
                          const sel = product.colors.find(c => c.name === color)
                          return sel ? `Còn ${sel.countInStock} sản phẩm màu ${color}` : ''
                        })()}
                      </div>
                    )}
                  </div>
                )}

                  {successAddToCart && (
                    <Message variant='success' style={{marginBottom: '12px'}}>
                      <i className='fas fa-check-circle me-2'></i>Đã thêm vào giỏ hàng!
                    </Message>
                  )}
                  <Button
                    onClick={addToCartHandler}
                    type="button"
                    disabled={(() => {
                      const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                      return loading || s === 0 || qty > s || !color
                    })()}
                    style={{
                      width: '100%',
                      background: successAddToCart ? '#28a745' : 'linear-gradient(135deg, #33FFCC, #00D4AA)',
                      border: 'none',
                      color: '#0f0f23',
                      fontWeight: '700',
                      padding: '14px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      marginBottom: '12px',
                      boxShadow: '0 6px 20px rgba(51,255,204,0.4)',
                      cursor: loading || product.countInStock === 0 || qty > product.countInStock ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <i className={`${successAddToCart ? 'fas fa-check' : 'fas fa-shopping-cart'} me-2`}></i>
                    {successAddToCart ? 'Đã thêm!' : 'Thêm Vào Giỏ'}
                  </Button>

                <Button
                  onClick={buyNowHandler}
                  disabled={(() => {
                    const s = product.colors?.find(c => c.name === color)?.countInStock ?? product.countInStock
                    return s === 0 || !color
                  })()}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '2px solid #33FFCC',
                    color: '#33FFCC',
                    fontWeight: '700',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    boxShadow: '0 4px 15px rgba(51,255,204,0.2)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className='fas fa-bolt me-2'></i>Mua Ngay
                </Button>
              </div>
            </Col>
          </Row>

          {/* ===== REVIEWS ===== */}
          <div style={{ ...cardStyle, marginTop: '16px' }}>
            <h3 style={{
              color: '#33FFCC',
              fontWeight: '700',
              marginBottom: '28px',
              paddingBottom: '16px',
              borderBottom: '2px solid rgba(51,255,204,0.2)',
            }}>
              <i className='fas fa-star me-2'></i>Đánh Giá Sản Phẩm
            </h3>

            <Row>
              {/* Danh sách đánh giá */}
              <Col md={6}>
                {!product.reviews || product.reviews.length === 0 ? (
                  <Message>Chưa có đánh giá nào</Message>
                ) : (
                  product.reviews.map((review) => (
                    <div key={review._id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: '#ffffff' }}>{review.name || 'Người dùng'}</strong>
                        <span style={{ color: '#b8bcc8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {review.createdAt?.substring(0, 10)}
                          {userInfo && userInfo.isAdmin && (
                            <i className='fas fa-trash text-danger ms-2' style={{cursor: 'pointer'}} onClick={() => deleteReviewHandler(review._id)}></i>
                          )}
                        </span>
                      </div>
                      <Rating value={review.rating || 0} />
                      <p style={{ color: '#e0e0e0', marginTop: '10px', marginBottom: 0, fontSize: '14px', lineHeight: '1.6' }}>
                        {review.comment}
                      </p>
                    </div>
                  ))
                )}
              </Col>

              {/* Form đánh giá */}
              <Col md={6}>
                <div style={{
                  background: 'rgba(51,255,204,0.04)',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid rgba(51,255,204,0.2)',
                }}>
                  <h5 style={{ color: '#ffffff', fontWeight: '600', marginBottom: '20px' }}>
                    ✍️ Viết đánh giá của bạn
                  </h5>

                  {successProductReview && <Message variant='success'>Gửi đánh giá thành công!</Message>}
                  {loadingProductReview && <Loader />}
                  {errorProductReview && <Message variant='danger'>{errorProductReview}</Message>}

                  {userInfo ? (
                    <Form onSubmit={submitHandler}>
                      <Form.Group controlId='rating' className='mb-3'>
                        <Form.Label style={{ color: '#b8bcc8', fontSize: '14px' }}>Xếp hạng</Form.Label>
                        <Form.Control
                          as='select'
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                          style={{
                            background: '#0f0f23',
                            border: '1px solid rgba(51,255,204,0.4)',
                            color: '#ffffff',
                            borderRadius: '8px',
                          }}
                        >
                          <option value=''>Chọn xếp hạng...</option>
                          <option value='1'>⭐ 1 - Tệ</option>
                          <option value='2'>⭐⭐ 2 - Hơi tệ</option>
                          <option value='3'>⭐⭐⭐ 3 - Tốt</option>
                          <option value='4'>⭐⭐⭐⭐ 4 - Rất tốt</option>
                          <option value='5'>⭐⭐⭐⭐⭐ 5 - Hoàn hảo</option>
                        </Form.Control>
                      </Form.Group>

                      <Form.Group controlId='comment' className='mb-3'>
                        <Form.Label style={{ color: '#b8bcc8', fontSize: '14px' }}>Bình luận</Form.Label>
                        <Form.Control
                          as='textarea'
                          rows={4}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder='Chia sẻ trải nghiệm của bạn về sản phẩm...'
                          style={{
                            background: '#0f0f23',
                            border: '1px solid rgba(51,255,204,0.4)',
                            color: '#ffffff',
                            borderRadius: '8px',
                            resize: 'none',
                          }}
                        />
                      </Form.Group>

                      <Button
                        disabled={loadingProductReview}
                        type='submit'
                        style={{
                          background: '#33FFCC',
                          border: 'none',
                          color: '#0f0f23',
                          fontWeight: '700',
                          padding: '10px 28px',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      >
                        <i className='fas fa-paper-plane me-2'></i>Gửi đánh giá
                      </Button>
                    </Form>
                  ) : (
                    <Message>
                      Vui lòng{' '}
                      <Link to='/login' style={{ color: '#33FFCC', fontWeight: '600' }}>
                        đăng nhập
                      </Link>{' '}
                      để viết đánh giá
                    </Message>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        </>
      )}
    </>
  )
}

export default ProductScreen