import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Row, Col, ListGroup, Image, Card } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import CheckoutSteps from '../components/CheckoutSteps'
import { createOrder } from '../actions/orderActions'
import { ORDER_CREATE_RESET } from '../constants/orderConstants'
import { USER_DETAILS_RESET } from '../constants/userConstants'

const PlaceOrderScreen = ({ history }) => {
  const dispatch = useDispatch()

  const cart = useSelector((state) => state.cart)

  // Lấy danh sách sản phẩm đã tick từ CartScreen (localStorage)
  const selectedCartItems = (() => {
    try {
      const raw = localStorage.getItem('selectedCartItems')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  })()

  const selectedKeys = (selectedCartItems || []).map(
    (it) => `${it.product}_${it.color || ''}`
  )

  // Nếu có selected thì chỉ đặt các item đó; nếu không có selected thì fallback đặt toàn bộ cart
  const orderItems =
    selectedKeys.length > 0
      ? (cart.cartItems || []).filter((item) =>
          selectedKeys.includes(`${item.product}_${item.color || ''}`)
        )
      : cart.cartItems || []



  // VN validation for missing shipping fields - Simplified (no district)
  const missingShipping = !cart.shippingAddress.fullName || !cart.shippingAddress.phone || 
      !cart.shippingAddress.province || 
      !cart.shippingAddress.ward || !cart.shippingAddress.detail;
      
  const missingPayment = !cart.paymentMethod;
  
  if (missingShipping) {
    history.push('/shipping?error=province');
  } else if (missingPayment) {
    history.push('/payment');
  }

  // Format tiền VNĐ
  const formatVND = (num) => {
    return Number(num).toLocaleString('vi-VN')
  }

  const orderCreate = useSelector((state) => state.orderCreate)
  const { order, success, error } = orderCreate

  useEffect(() => {
    if (success) {
      history.push(`/order/${order._id}`)
      dispatch({ type: USER_DETAILS_RESET })
      dispatch({ type: ORDER_CREATE_RESET })
    }
  }, [history, success, dispatch, order])

  const placeOrderHandler = () => {
    dispatch(
      createOrder({
        orderItems,
        shippingAddress: cart.shippingAddress,
        paymentMethod: cart.paymentMethod,
        itemsPrice: orderItems.reduce((acc, item) => acc + item.price * item.qty, 0),
        shippingPrice: cart.itemsPrice > 1000000 ? 0 : 30000,
        taxPrice: Number((0.1 * orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)).toFixed(2)),
        totalPrice: (
          Number(
            orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)
          ) +
          Number(cart.itemsPrice > 1000000 ? 0 : 30000) +
          Number(
            (0.1 * orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)).toFixed(2)
          )
        ).toFixed(2),
      })
    )
  }


  return (
    <>
      <CheckoutSteps step1 step2 step3 step4 />

      <Row>
        <Col md={8}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(51,255,204,0.15)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#33FFCC', marginBottom: '16px' }}>
              <i className='fas fa-map-marker-alt me-2'></i>Địa Chỉ Giao Hàng
            </h3>
            <div style={{ color: '#ffffff' }}>
              <p><strong style={{ color: '#33FFCC' }}>Người nhận:</strong> {cart.shippingAddress.fullName}</p>
              <p><strong style={{ color: '#33FFCC' }}>SĐT:</strong> {cart.shippingAddress.phone}</p>
              <p><strong style={{ color: '#33FFCC' }}>Tỉnh/TP:</strong> {cart.shippingAddress.province}</p>
              <p><strong style={{ color: '#33FFCC' }}>Phường/Xã:</strong> {cart.shippingAddress.ward}</p>
              <p><strong style={{ color: '#33FFCC' }}>Số nhà, tên đường:</strong> {cart.shippingAddress.detail}</p>
            </div>
          </div>


          <ListGroup.Item>
            <h2>Phương Thức Thanh Toán</h2>
            <p style={{ color: '#ffffff' }}>
              <strong>Phương thức: </strong>
              {cart.paymentMethod}
            </p>
          </ListGroup.Item>

          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(51,255,204,0.15)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#33FFCC', marginBottom: '16px' }}>
              <i className='fas fa-shopping-bag me-2'></i>Sản Phẩm Đặt Hàng
            </h3>
            {cart.cartItems.length === 0 ? (
              <Message>Giỏ Hàng Trống</Message>
            ) : (
              <div>
                {cart.cartItems.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 0',
                    borderBottom: index < cart.cartItems.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none'
                  }}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'contain',
                        borderRadius: '12px',
                        border: '1px solid rgba(51,255,204,0.15)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <Link to={`/product/${item.product}`} style={{ 
                        color: '#ffffff', 
                        textDecoration: 'none', 
                        fontWeight: '600' 
                      }}>
                        {item.name}
                      </Link>
                    </div>
                    <span 
                      className="price-text price-tooltip" 
                      data-full-price={formatVND(item.qty * item.price) + 'đ'}
                      title={formatVND(item.qty * item.price) + 'đ'}
                      style={{ color: '#33FFCC', fontWeight: '700', minWidth: '120px', textAlign: 'right', display: 'inline-block' }}
                    >
                      {formatVND(item.qty * item.price)}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>

        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Tổng Đơn Hàng</h2>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Sản Phẩm</Col>
                  <Col>{formatVND(cart.itemsPrice)} đ</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Vận Chuyển</Col>
                  <Col>{formatVND(cart.shippingPrice)} đ</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Thuế</Col>
                  <Col>{formatVND(cart.taxPrice)} đ</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Tổng</Col>
                  <Col>
                    <strong>
                      <span 
                        className="price-text price-tooltip" 
                        data-full-price={formatVND(cart.totalPrice) + ' đ'}
                        title={formatVND(cart.totalPrice) + ' đ'}
                      >
                        {formatVND(cart.totalPrice)} đ
                      </span>
                    </strong>
                  </Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                {error && <Message variant='danger'>{error}</Message>}
              </ListGroup.Item>

              <ListGroup.Item>
                <Button
                  type='button'
                  className='btn-block'
                  disabled={cart.cartItems.length === 0}
                  onClick={placeOrderHandler}
                  style={{
                    background: '#33FFCC',
                    border: 'none',
                    color: '#0f0f23',
                    fontWeight: '700',
                    padding: '16px',
                    borderRadius: '12px'
                  }}
                >
                  <i className='fas fa-credit-card me-2'></i>Đặt Hàng
                </Button>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default PlaceOrderScreen