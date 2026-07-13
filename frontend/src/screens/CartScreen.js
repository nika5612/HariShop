import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Image, Form, Button } from 'react-bootstrap'
import Message from '../components/Message'
import CountdownTimer from '../components/CountdownTimer'
import { addToCart, removeFromCart, syncCartPrices } from '../actions/cartActions'

const SELECTED_ITEMS_STORAGE_KEY = 'cartSelectedItems'

const loadStoredSelection = () => {
  try {
    const raw = localStorage.getItem(SELECTED_ITEMS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const CartScreen = ({ match, location, history }) => {
  const productId = match.params.id
  const qty = location.search ? Number(new URLSearchParams(location.search).get('qty')) || 1 : 1
  const color = location.search ? new URLSearchParams(location.search).get('color') : 'Mặc định'
  const buynow = location.search ? new URLSearchParams(location.search).get('buynow') : false

  const dispatch = useDispatch()
  const cart = useSelector((state) => state.cart)
  const { cartItems } = cart

  // MỚI: giữ nguyên trạng thái tick chọn giữa các lần vào lại trang giỏ hàng (localStorage),
  // KHÔNG tự động chọn tất cả nữa — chỉ tự tick sản phẩm VỪA được thêm vào giỏ.
  const [selectedItems, setSelectedItemsState] = useState(loadStoredSelection)
  // MỚI (B8): thông báo khi giá 1 vài sản phẩm trong giỏ vừa được tự động cập nhật
  const [priceChangedItems, setPriceChangedItems] = useState([])

  const setSelectedItems = (items) => {
    setSelectedItemsState(items)
    localStorage.setItem(SELECTED_ITEMS_STORAGE_KEY, JSON.stringify(items))
  }

  useEffect(() => {
    if (productId) {
      dispatch(addToCart(productId, qty, color))
    }
  }, [dispatch, productId, qty, color])

  // MỚI: tự động tick sản phẩm VỪA được thêm vào giỏ (không đụng tới các sản phẩm khác).
  // Riêng "Mua ngay" (buynow) thì chỉ chọn đúng 1 sản phẩm đó để thanh toán ngay.
  useEffect(() => {
    if (!productId) return
    const key = `${productId}_${color || ''}`
    if (buynow) {
      setSelectedItems([key])
    } else {
      setSelectedItemsState((prev) => {
        if (prev.includes(key)) return prev
        const next = [...prev, key]
        localStorage.setItem(SELECTED_ITEMS_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, qty, color, buynow])

  // MỚI: dọn các key đã chọn nhưng sản phẩm không còn trong giỏ nữa (vd bị xoá ở tab khác)
  useEffect(() => {
    if (cartItems.length === 0) return
    const validKeys = new Set(cartItems.map((i) => `${i.product}_${i.color || ''}`))
    setSelectedItemsState((prev) => {
      const filtered = prev.filter((k) => validKeys.has(k))
      if (filtered.length !== prev.length) {
        localStorage.setItem(SELECTED_ITEMS_STORAGE_KEY, JSON.stringify(filtered))
        return filtered
      }
      return prev
    })
  }, [cartItems])

  // MỚI (B8): mỗi lần vào trang giỏ hàng, tự đồng bộ lại giá theo giá hiện tại của
  // sản phẩm (vd Flash Sale đã hết hạn → tự trả về giá gốc), không cần khách làm gì.
  useEffect(() => {
    dispatch(syncCartPrices()).then((changed) => {
      if (changed && changed.length > 0) setPriceChangedItems(changed)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])


  const removeFromCartHandler = (id, color) => {
    dispatch(removeFromCart(id, color))
    const key = `${id}_${color || ''}`
    setSelectedItems(selectedItems.filter(item => item !== key))
  }

  const toggleSelect = (key) => {
    if (selectedItems.includes(key)) {
      setSelectedItems(selectedItems.filter((i) => i !== key))
    } else {
      setSelectedItems([...selectedItems, key])
    }
  }

  // MỚI: Chọn tất cả / Bỏ chọn tất cả
  const allKeys = cartItems.map((item) => `${item.product}_${item.color || ''}`)
  const isAllSelected = allKeys.length > 0 && allKeys.every((k) => selectedItems.includes(k))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([])
    } else {
      setSelectedItems(allKeys)
    }
  }

  const checkoutHandler = () => {
    const selectedObjects = cartItems

      .filter(item => selectedItems.includes(`${item.product}_${item.color || ''}`))
      .map(item => ({ product: item.product, color: item.color || '' }))
    localStorage.setItem('selectedCartItems', JSON.stringify(selectedObjects))
    history.push('/login?redirect=checkout')
  }

  const selectedCartObjects = cartItems.filter(

    item => selectedItems.includes(`${item.product}_${item.color || ''}`)
  )
  const totalQty = selectedCartObjects.reduce((acc, item) => acc + item.qty, 0)
  const totalPrice = selectedCartObjects.reduce((acc, item) => acc + item.qty * item.price, 0)

  const cardStyle = {
    background: '#1a1a2e',
    border: '1px solid rgba(51,255,204,0.15)',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.8rem', marginBottom: '4px' }}>
          <i className='fas fa-shopping-cart me-3' style={{ color: '#33FFCC' }}></i>
          Giỏ Hàng
        </h1>
        <p style={{ color: '#b8bcc8', margin: 0 }}>
          {totalQty > 0 ? `${totalQty} sản phẩm trong giỏ` : 'Giỏ hàng trống'}
        </p>
      </div>

      {/* MỚI (B8): thông báo khi giá 1 vài sản phẩm vừa được tự động cập nhật (vd Flash Sale hết hạn) */}
      {priceChangedItems.length > 0 && (
        <div style={{
          background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.35)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#ffd166', fontSize: '13.5px',
        }}>
          <i className='fas fa-info-circle me-2'></i>
          Giá của {priceChangedItems.length} sản phẩm trong giỏ hàng vừa được cập nhật lại theo giá hiện tại (khuyến mãi đã kết thúc hoặc thay đổi):
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            {priceChangedItems.map((it, idx) => (
              <li key={idx}>
                {it.name}: <span style={{ textDecoration: 'line-through', color: '#8a8fa3' }}>{it.oldPrice.toLocaleString('vi-VN')}đ</span>
                {' → '}
                <strong>{it.newPrice.toLocaleString('vi-VN')}đ</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Row className='g-4'>
        <Col md={8}>
          {cartItems.length === 0 ? (
            <Message>
              Giỏ hàng của bạn đang trống.{' '}
              <Link to='/' style={{ color: '#33FFCC', fontWeight: '600' }}>
                Tiếp tục mua sắm
              </Link>
            </Message>
          ) : (
            <div style={cardStyle}>
              {/* MỚI: Chọn tất cả / Bỏ chọn tất cả */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                paddingBottom: '14px', marginBottom: '4px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <Form.Check
                  type='checkbox'
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ transform: 'scale(1.3)', cursor: 'pointer', marginRight: '5px' }}
                />
                <span
                  onClick={toggleSelectAll}
                  style={{ color: '#eef0f7', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} ({selectedItems.length}/{cartItems.length})
                </span>
              </div>

              {cartItems.map((item, index) => (
                <div
                  key={item.product}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 0',
                    borderBottom: index < cartItems.length - 1
                      ? '1px solid rgba(255,255,255,0.07)'
                      : 'none',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <Form.Check 
                      type="checkbox"
                      checked={selectedItems.includes(`${item.product}_${item.color || ''}`)}
                      onChange={() => toggleSelect(`${item.product}_${item.color || ''}`)}
                      style={{ transform: 'scale(1.3)', cursor: 'pointer', marginRight: '5px' }}
                    />
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'contain',
                        background: '#0f0f23',
                        borderRadius: '12px',
                        padding: '8px',
                        border: '1px solid rgba(51,255,204,0.15)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/product/${item.product}`}
                      style={{
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '15px',
                        display: 'block',
                        marginBottom: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </Link>
                    <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '4px' }}>
                      Phân loại: {item.color || 'Mặc định'}
                    </div>
                    <div style={{ color: '#33FFCC', fontWeight: '700', fontSize: '15px' }}>
                      {item.price.toLocaleString('vi-VN')}đ
                    </div>
                    {/* MỚI (B8): đếm ngược Flash Sale — nằm dưới giá; khi hết giờ tự đồng bộ lại giá ngay */}
                    {item.isFlashSaleActive && item.flashSaleEndsAt && (
                      <div style={{ marginTop: '4px' }}>
                        <CountdownTimer
                          endsAt={item.flashSaleEndsAt}
                          onExpire={() => {
                            dispatch(syncCartPrices()).then((changed) => {
                              if (changed && changed.length > 0) setPriceChangedItems(changed)
                            })
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ flexShrink: 0, width: '90px' }}>
                    <Form.Control
                      as='select'
                      value={item.qty}
                      onChange={(e) =>
                        dispatch(addToCart(item.product, Number(e.target.value), item.color))
                      }
                      style={{
                        background: '#0f0f23',
                        border: '1px solid #33FFCC',
                        color: '#ffffff',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '14px',
                      }}
                    >
                      {[...Array(item.countInStock).keys()].map((x) => (
                        <option key={x + 1} value={x + 1} style={{ background: '#1a1a2e' }}>
                          {x + 1}
                        </option>
                      ))}
                    </Form.Control>
                  </div>

                  <div style={{ flexShrink: 0, width: '110px', textAlign: 'right' }}>
                    <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '2px' }}>Thành tiền</div>
                    <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>
                      {(item.qty * item.price).toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => removeFromCartHandler(item.product, item.color)}
                      style={{
                        background: 'rgba(255,107,107,0.15)',
                        border: '1px solid rgba(255,107,107,0.4)',
                        color: '#ff6b6b',
                        borderRadius: '10px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,107,107,0.25)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255,107,107,0.15)'}
                    >
                      <i className='fas fa-trash'></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Col>

        <Col md={4}>
          <div style={{ ...cardStyle, border: '1px solid rgba(51,255,204,0.35)', position: 'sticky', top: '100px' }}>
            <h4 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '24px' }}>
              Tóm tắt đơn hàng
            </h4>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              marginBottom: '12px',
            }}>
              <span style={{ color: '#b8bcc8' }}>Số lượng sản phẩm</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{totalQty}</span>
            </div>

            <div style={{
              background: 'rgba(51,255,204,0.08)',
              border: '2px solid #33FFCC',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '6px' }}>Tổng thanh toán</div>
              <div style={{ color: '#33FFCC', fontSize: '1.6rem', fontWeight: '700' }}>
                {totalPrice.toLocaleString('vi-VN')}đ
              </div>
            </div>

            <Button
              type='button'
              onClick={checkoutHandler}
              style={{
                width: '100%',
                background: selectedCartObjects.length === 0 ? 'rgba(68,68,68,0.5)' : 'linear-gradient(135deg, #33FFCC, #00D4AA)',
                border: 'none',
                color: '#0f0f23',
                fontWeight: '700',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '16px',
                marginBottom: '16px',
                cursor: selectedCartObjects.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedCartObjects.length === 0 ? 'none' : '0 6px 20px rgba(51,255,204,0.4)',
                transition: 'all 0.3s ease'
              }}
              disabled={selectedCartObjects.length === 0}
            >
              <i className='fas fa-lock me-2'></i>
              {selectedCartObjects.length === 0 ? 'Chọn sản phẩm để thanh toán' : `Thanh Toán (${totalPrice.toLocaleString('vi-VN')}đ)`}
            </Button>

            <Link
              to='/'
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#33FFCC',
                textDecoration: 'none',
                fontSize: '15px',
                padding: '12px',
                border: '2px solid #33FFCC',
                borderRadius: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#33FFCC';
                e.target.style.color = '#0f0f23';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#33FFCC';
              }}
            >
              <i className='fas fa-arrow-left me-2'></i>
              Tiếp tục mua sắm
            </Link>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default CartScreen