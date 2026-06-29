import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Row, Col, ListGroup, Image, Card, Form } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'

import Message from '../components/Message'
import { createOrder } from '../actions/orderActions'
import { getUserDetails } from '../actions/userActions'
import { listAddresses } from '../actions/addressActions'
import { ORDER_CREATE_RESET } from '../constants/orderConstants'
import { getShippingQuotes } from '../actions/shippingActions'

const carrierLabel = (carrier) => {
  switch (carrier) {
    case 'ghn': return 'GHN'
    case 'viettelpost': return 'Viettel Post'
    case 'fallback': return 'Tạm tính'
    default: return carrier
  }
}

const DatHangScreen = ({ history, location }) => {
  const dispatch = useDispatch()

  const cart = useSelector((state) => state.cart)
  const userDetails = useSelector((state) => state.userDetails)
  const { user } = userDetails
  const addressList = useSelector((state) => state.address.addresses || [])
  const orderCreate = useSelector((state) => state.orderCreate)
  const shippingQuotesState = useSelector((state) => state.shippingQuotes)
  const { loading: quotesLoading, error: quotesError, quotes = [] } = shippingQuotesState

  const { order, success, error } = orderCreate
  const defaultAddress = addressList.find(addr => addr.isDefault) || cart.shippingAddress

  // States for form
  const [deliveryMethod, setDeliveryMethod] = useState('fallback:fallback')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherDiscount, setVoucherDiscount] = useState(0)
  const [shopMessage, setShopMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [showMoMoQR, setShowMoMoQR] = useState(false)
  const [showVCBQR, setShowVCBQR] = useState(false)

  const { cartItems, itemsPrice: subtotal } = cart
  
  // Compute total weight from cart items (g)
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.weight * item.qty || 0), 0)

  useEffect(() => {
    if (!cartItems.length) {
      history.push('/cart')
    }
    dispatch({ type: ORDER_CREATE_RESET })
    dispatch(getUserDetails('profile'))
    dispatch(listAddresses())
  }, [dispatch, history, cartItems.length])

  useEffect(() => {
    if (!defaultAddress || !cartItems.length) return
    const toAddress = {
      province: defaultAddress.province || '',
      ward: defaultAddress.ward || '',
      detail: defaultAddress.detail || defaultAddress.address || '',
      district: defaultAddress.district || '',
      districtId: defaultAddress.ghnDistrictId || defaultAddress.districtId,
      wardCode: defaultAddress.ghnWardCode || defaultAddress.wardCode,
    }
    const t = setTimeout(() => {
      dispatch(getShippingQuotes(cartItems, toAddress))
    }, 400)
    return () => clearTimeout(t)
  }, [dispatch, defaultAddress, cartItems])

  useEffect(() => {
    if (success) {
      history.push(`/order/${order._id}`)
    }
  }, [success, history, order])

  const selectedQuote =
    quotes.find((q) => `${q.carrier}:${q.serviceCode}` === deliveryMethod) ||
    quotes[0] ||
    { carrier: 'fallback', serviceCode: 'fallback', fee: 30000, serviceName: 'Phí vận chuyển tạm tính', etaLabel: null }

  const deliveryFee = Number(selectedQuote.fee || 0)

  // Mock voucher apply
  const applyVoucher = () => {
    // Mock: 10% or 50k max
    const discount = Math.min(subtotal * 0.1, 50000)
    setVoucherDiscount(discount)
  }

  const totalPrice = Number(subtotal || 0) + deliveryFee - voucherDiscount

  const formatVND = (num) => Number(num).toLocaleString('vi-VN')

  const placeOrderHandler = () => {
    // Enhanced VN validation - Fix "Province required"
    const addr = defaultAddress
    const validationErrors = [];
    
    if (!addr) validationErrors.push('Vui lòng chọn địa chỉ giao hàng!');
    else {
      if (!addr.fullName?.trim()) validationErrors.push('Họ tên không được để trống');
      if (!addr.phone?.trim()) validationErrors.push('Số điện thoại không hợp lệ');
      if (!addr.province?.trim()) validationErrors.push('Tỉnh/Thành phố không được để trống');
      // if (!addr.district?.trim()) validationErrors.push('Quận/Huyện không được để trống');
      if (!addr.ward?.trim()) validationErrors.push('Phường/Xã không được để trống');
      if (!addr.detail?.trim()) validationErrors.push('Địa chỉ chi tiết không được để trống');
    }
    
    if (!termsAgreed) validationErrors.push('Vui lòng đồng ý với điều khoản');
    
    if (validationErrors.length > 0) {
      alert('❌ ' + validationErrors.join('\\n'));
      return;
    }

    // Save cart extras to localStorage (fallback if actions undefined)
    localStorage.setItem('deliveryMethod', deliveryMethod)
    localStorage.setItem('voucherCode', voucherCode)
    localStorage.setItem('shopMessage', shopMessage)
    localStorage.setItem('deliveryFee', deliveryFee.toString())
    localStorage.setItem('voucherDiscount', voucherDiscount.toString())

    dispatch(createOrder({
      orderItems: cartItems,
      shippingAddress: {
        fullName: defaultAddress.fullName || user?.name || '',
        phone: defaultAddress.phone || '',
        province: defaultAddress.province || '',
        // district: defaultAddress.district || '',
        ward: defaultAddress.ward || '',
        detail: defaultAddress.detail || defaultAddress.address || ''
      },
      paymentMethod,
      deliveryMethod: selectedQuote.carrier || 'fallback',
      shippingProvider: selectedQuote.carrier || '',
      shippingServiceCode: selectedQuote.serviceCode || '',
      shippingServiceName: selectedQuote.serviceName || '',
      shippingEtaDate: selectedQuote.etaDate || null,
      voucherCode,
      shopMessage,
      totalWeight,
      itemsPrice: subtotal,
      deliveryFee,
      voucherDiscount,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice
    }))
  }


  const isButtonDisabled = !termsAgreed || !cartItems.length || !deliveryMethod || !paymentMethod || !defaultAddress

  return (
    <>
      <h1 style={{ color: '#ffffff', marginBottom: '2rem' }}>
        <i className='fas fa-shopping-bag me-3' style={{ color: '#33FFCC' }}></i>
        Đặt Hàng
      </h1>

      <Row>
        <Col md={8}>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '16px',
            border: '1px solid rgba(51,255,204,0.15)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            {/* Thông tin tài khoản */}
            <h3 style={{ color: '#33FFCC', marginBottom: '16px' }}>Thông tin tài khoản</h3>
            {user ? (
              <>
                <p><strong>Tên:</strong> {user.name}</p>
                <p><strong>Số điện thoại:</strong> {defaultAddress.phone || 'Chưa có'}</p>
                <p><strong>Địa chỉ mặc định:</strong> {defaultAddress ? `${defaultAddress.fullName} - ${defaultAddress.detail}, ${defaultAddress.ward}, ${defaultAddress.province}` : 'Chưa có'}</p>
                <Link to="/addresslist" state={{ from: location.pathname }} style={{ color: '#33FFCC' }}>
                  Thay đổi địa chỉ <i className="fas fa-edit"></i>
                </Link>
              </>
            ) : (
              <Message>Đang tải thông tin...</Message>
            )}
          </div>

          {/* Sản phẩm */}
          <Card style={{ background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: '16px' }}>
            <Card.Body>
              <h4 style={{ color: '#33FFCC' }}>Sản phẩm</h4>
              {cartItems.map((item, index) => (
                <ListGroup.Item key={index} style={{ background: 'transparent', border: 'none' }}>
                  <Row>
                    <Col md={2}>
                      <Image src={item.image} alt={item.name} fluid rounded style={{ maxHeight: '80px' }} />
                    </Col>
                    <Col md={7}>
                      <Link to={`/product/${item.product}`} style={{ color: '#ffffff' }}>{item.name}</Link>
                    </Col>
                    <Col md={3} className="text-end">
                      <div>{item.qty}x&nbsp;</div>
                      <span 
                        className="price-text price-tooltip d-block" 
                        data-full-price={formatVND(item.price) + 'đ'}
                        title={formatVND(item.price) + 'đ'}
                      >
                        {formatVND(item.price)}đ
                      </span>
                      &nbsp;=&nbsp;
                      <span 
                        className="price-text price-tooltip" 
                        data-full-price={formatVND(item.qty * item.price) + 'đ'}
                        title={formatVND(item.qty * item.price) + 'đ'}
                      >
                        {formatVND(item.qty * item.price)}đ
                      </span>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </Card.Body>
          </Card>

          {/* Voucher */}
          <div style={{ background: '#1a1a2e', borderRadius: '16px', border: '1px solid rgba(51,255,204,0.15)', padding: '20px', marginTop: '20px' }}>
            <h5 style={{ color: '#33FFCC' }}>Voucher</h5>
            <Row>
              <Col md={8}>
                <Form.Control
                  type="text"
                  placeholder="Nhập mã voucher"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  style={{ background: '#0f0f23', border: '1px solid #33FFCC', color: '#fff' }}
                />
              </Col>
              <Col md={4}>
                <Button variant="outline-success" onClick={applyVoucher} style={{ borderColor: '#33FFCC', color: '#33FFCC' }}>
                  Áp dụng
                </Button>
              </Col>
            </Row>
          </div>

          {/* Lời nhắn */}
          <div style={{ background: '#1a1a2e', borderRadius: '16px', border: '1px solid rgba(51,255,204,0.15)', padding: '20px', marginTop: '20px' }}>
            <h5 style={{ color: '#33FFCC' }}>Lời nhắn cho shop</h5>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Ghi chú cho shop (tùy chọn)..."
              value={shopMessage}
              onChange={(e) => setShopMessage(e.target.value)}
              style={{ background: '#0f0f23', border: '1px solid #33FFCC', color: '#fff' }}
            />
          </div>

          {/* Vận chuyển */}
          <div style={{ background: '#1a1a2e', borderRadius: '16px', border: '1px solid rgba(51,255,204,0.15)', padding: '20px', marginTop: '20px' }}>
            <h5 style={{ color: '#33FFCC' }}>Phương thức vận chuyển</h5>
            {quotesLoading && <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '10px' }}>Đang cập nhật phí vận chuyển...</div>}
            {quotesError && <div style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '10px' }}>{quotesError}</div>}
            <Form.Control 
              as="select" 
              value={deliveryMethod} 
              onChange={(e) => setDeliveryMethod(e.target.value)} 
              style={{ 
                background: '#0f0f23', 
                border: '1px solid rgba(51,255,204,0.4)', 
                color: '#ffffff',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '15px'
              }}
            >
              {(quotes.length ? quotes : [selectedQuote]).map((q) => {
                const id = `${q.carrier}:${q.serviceCode}`
                const label = `${carrierLabel(q.carrier)}${q.serviceName ? ` - ${q.serviceName}` : ''}`
                const fee = Number(q.fee || 0)
                return (
                  <option key={id} value={id} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    {label} - {formatVND(fee)}đ
                  </option>
                )
              })}
            </Form.Control>
            {selectedQuote.etaLabel && (
              <div style={{ color: '#b8bcc8', fontSize: '12px', marginTop: '8px' }}>{selectedQuote.etaLabel}</div>
            )}
          </div>

          {/* Thanh toán */}
          <div style={{ background: '#1a1a2e', borderRadius: '16px', border: '1px solid rgba(51,255,204,0.15)', padding: '20px', marginTop: '20px' }}>
            <h5 style={{ color: '#33FFCC' }}>Phương thức thanh toán</h5>
            <Form.Group>
              <Form.Check
                type="radio"
                label="Thanh toán khi nhận hàng (COD)"
                id="cod"
                checked={paymentMethod === 'COD'}
                onChange={() => { setPaymentMethod('COD'); setShowMoMoQR(false); setShowVCBQR(false); }}
              />
              <Form.Check
                type="radio"
                label="MoMo"
                id="momo"
                checked={paymentMethod === 'MoMo'}
                onChange={() => { setPaymentMethod('MoMo'); setShowMoMoQR(true); setShowVCBQR(false); }}
              />
              {showMoMoQR && (
                <div className="mt-2">
                  <img src="/images/momo.jpeg" alt="MoMo QR" style={{ maxWidth: '150px', borderRadius: '8px' }} />
                  <p className="small text-muted mt-1">Quét mã QR để chuyển khoản</p>
                </div>
              )}
              <Form.Check
                type="radio"
                label="Vietcombank"
                id="vcb"
                checked={paymentMethod === 'VCB'}
                onChange={() => { setPaymentMethod('VCB'); setShowVCBQR(true); setShowMoMoQR(false); }}
              />
              {showVCBQR && (
                <div className="mt-2">
                  <img src="/images/vcb.jpeg" alt="VCB QR" style={{ maxWidth: '150px', borderRadius: '8px' }} />
                  <p className="small text-muted mt-1">Quét mã QR Vietcombank</p>
                </div>
              )}
            </Form.Group>
          </div>

          {/* Terms */}
          <Form.Check
            type="checkbox"
            label="Đồng ý tuân theo các điều khoản của cửa hàng"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
            style={{ marginTop: '20px' }}
          />
        </Col>

        {/* Summary */}
        <Col md={4}>
          <Card style={{ background: '#1a1a2e', border: '1px solid #33FFCC', borderRadius: '16px', position: 'sticky', top: '20px' }}>
            <Card.Body>
              <h3 style={{ color: '#33FFCC', textAlign: 'center' }}>Chi tiết thanh toán</h3>
              <hr style={{ borderColor: 'rgba(51,255,204,0.3)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tổng tiền sản phẩm</span>
                <span 
                  className="price-text price-tooltip" 
                  data-full-price={formatVND(subtotal) + 'đ'}
                  title={formatVND(subtotal) + 'đ'}
                >
                  {formatVND(subtotal)}đ
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#b8bcc8' }}>
                <span>Tổng trọng lượng</span>
                <span>{totalWeight.toLocaleString()}g ({Math.ceil(totalWeight/1000)}kg)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Phí vận chuyển</span>
                <span 
                  className="price-text price-tooltip" 
                  data-full-price={formatVND(deliveryFee) + 'đ'}
                  title={formatVND(deliveryFee) + 'đ'}
                >
                  {formatVND(deliveryFee)}đ
                </span>
              </div>

              {voucherDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#33FFCC' }}>
                  <span>Giảm giá voucher</span>
                  <span 
                    className="price-text price-tooltip" 
                    data-full-price={'-' + formatVND(voucherDiscount) + 'đ'}
                    title={'-' + formatVND(voucherDiscount) + 'đ'}
                    style={{color: '#33FFCC'}}
                  >
                    -{formatVND(voucherDiscount)}đ
                  </span>
                </div>
              )}

              <hr style={{ borderColor: 'rgba(51,255,204,0.5)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '700', color: '#33FFCC' }}>
                <span>Tổng thanh toán</span>
                <span 
                  className="price-text price-tooltip" 
                  data-full-price={formatVND(totalPrice) + ' VNĐ'}
                  title={formatVND(totalPrice) + ' VNĐ'}
                >
                  {formatVND(totalPrice)} VNĐ
                </span>
              </div>

              {error && <Message variant="danger" style={{ marginTop: '16px' }}>{error}</Message>}

              <Button
                type="button"
                className="btn-block mt-3"
                disabled={isButtonDisabled}
                onClick={placeOrderHandler}
                style={{
                  background: isButtonDisabled ? '#444' : '#33FFCC',
                  border: 'none',
                  color: '#0f0f23',
                  fontWeight: '700',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  width: '100%'
                }}
              >
                <i className="fas fa-check me-2"></i>
                Đặt hàng
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default DatHangScreen

