import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Image, Form, Button } from 'react-bootstrap'
import Message from '../components/Message'
import { addToCart, removeFromCart } from '../actions/cartActions'

const CartScreen = ({ match, location, history }) => {
  const productId = match.params.id
  const qty = location.search ? Number(new URLSearchParams(location.search).get('qty')) || 1 : 1
  const color = location.search ? new URLSearchParams(location.search).get('color') : 'Mặc định'
  const buynow = location.search ? new URLSearchParams(location.search).get('buynow') : false

  const dispatch = useDispatch()
  const cart = useSelector((state) => state.cart)
  const { cartItems } = cart

  const [selectedItems, setSelectedItems] = useState([])

  useEffect(() => {
    if (productId) {
      dispatch(addToCart(productId, qty, color))
    }
  }, [dispatch, productId, qty, color])

  useEffect(() => {
    if (buynow && productId) {
      setSelectedItems([`${productId}_${color || ''}`])

    } else if (cartItems.length > 0 && selectedItems.length === 0) {
      setSelectedItems(cartItems.map(item => `${item.product}_${item.color || ''}`))

    }
  }, [cartItems, buynow, productId, selectedItems.length])

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