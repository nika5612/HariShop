import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col } from 'react-bootstrap'
import Message from '../components/Message'
import Loader from '../components/Loader'
import TermsModal from '../components/TermsModal'
import VoucherModal from '../components/VoucherModal'

import { createOrder } from '../actions/orderActions'
import { getUserDetails } from '../actions/userActions'
import { listAddresses } from '../actions/addressActions'
import { ORDER_CREATE_RESET } from '../constants/orderConstants'
import {
  saveDeliveryMethod,
  saveDeliveryFee,
  saveVoucherCode,
  saveVoucherDiscount,
  saveShopMessage,
  savePaymentMethod,
  saveDeliveryProvider,
} from '../actions/cartActions'
import { validateVoucherCode } from '../actions/voucherActions'

import { listProductDetails } from '../actions/productActions'
import { getShippingQuotes } from '../actions/shippingActions'


const generateTransferContent = () =>

  'TT' + String(Math.floor(100000 + Math.random() * 900000))

const carrierLabel = (carrier) => {
  switch (carrier) {
    case 'ghn': return 'GHN'
    case 'ghtk': return 'GHTK'
    case 'fallback': return 'Tạm tính'
    default: return carrier
  }
}


const formatAddress = (addr) => {
  return [
    addr.detail,
    addr.ward,
    addr.province,
    addr.address,
    addr.city,
  ].filter(Boolean).join(', ')
}

const CheckoutScreen = ({ history, location }) => {
  const urlParams = new URLSearchParams(location.search)
  const isBuyNow = urlParams.get('buyNow') === 'true'
  const buyNowProductId = isBuyNow ? urlParams.get('productId') : null
  const buyNowQty = isBuyNow ? Number(urlParams.get('qty') || 1) : 1
  const buyNowColor = isBuyNow ? urlParams.get('color') || 'Mặc định' : null

  const [buyNowItem, setBuyNowItem] = useState(null)

  const dispatch = useDispatch()

  const productDetails = useSelector((state) => state.productDetails)
  const { product: buyNowProduct, loading: productLoading } = productDetails

  const cart = useSelector((state) => state.cart)
  const { cartItems } = cart

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  // ── MỚI (B1): kiểm tra tài khoản có đang bị hạn chế COD không (lấy dữ liệu mới nhất từ server) ──
  const userDetails = useSelector((state) => state.userDetails)
  const { user: profileUser } = userDetails
  const codRestricted = !!profileUser?.codRestricted

  const address = useSelector((state) => state.address)
  const { addresses = [] } = address

  const orderCreate = useSelector((state) => state.orderCreate)
  const { loading, success, error, order } = orderCreate

  const shippingQuotesState = useSelector((state) => state.shippingQuotes)
  const { loading: quotesLoading, error: quotesError, quotes = [] } = shippingQuotesState

  const [selectedCartItems, setSelectedCartItems] = useState([])
  const [selectedCartItemsLoaded, setSelectedCartItemsLoaded] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressList, setShowAddressList] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState('fallback')
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')

  // MỚI: state cho popup chọn voucher kiểu Shopee (thay cho ô nhập tay đơn giản)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState(null) // { code, name, type, discountAmount }
  const [voucherNotice, setVoucherNotice] = useState('') // thông báo khi voucher tự động bị bỏ áp dụng
  const voucherDiscount = Number(selectedVoucher?.discountAmount) || 0

  const [shopMessage, setShopMessage] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const transferContentRef = useRef(generateTransferContent())

  const transferContent = transferContentRef.current

  useEffect(() => {
    if (!userInfo) {
      history.push('/login?redirect=checkout')
      return
    }
    dispatch(listAddresses())
    dispatch(getUserDetails('profile')) // MỚI (B1): lấy trạng thái codRestricted mới nhất
    dispatch({ type: ORDER_CREATE_RESET })

    if (!isBuyNow) {
      try {
        const saved = localStorage.getItem('selectedCartItems')
        if (saved) {
          setSelectedCartItems(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load selectedCartItems:', e)
      } finally {
        setSelectedCartItemsLoaded(true)
      }
    } else {
      setSelectedCartItemsLoaded(true)
    }


    if (isBuyNow && buyNowProductId) {
      dispatch(listProductDetails(buyNowProductId))
    }
  }, [dispatch, userInfo, history, isBuyNow, buyNowProductId])

  // ── MỚI (B1): nếu tài khoản đang bị hạn chế COD, tự động chuyển sang thanh toán online ──
  useEffect(() => {
    if (codRestricted && paymentMethod === 'cod') {
      setPaymentMethod('online')
    }
  }, [codRestricted, paymentMethod])

  useEffect(() => {
    if (isBuyNow && buyNowProductId && !productLoading && buyNowProduct) {
      // ── MỚI: lấy countInStock theo màu được chọn ─────────────
        const colorStockForBuyNow = (() => {
        if (buyNowProduct.colors && buyNowProduct.colors.length > 0 && buyNowColor) {

          const found = buyNowProduct.colors.find((c) => c.name === buyNowColor)
          if (found) return found.countInStock
        }
        return buyNowProduct.countInStock
      })()

      const singleItem = {
        product: buyNowProductId,

        name: buyNowProduct.name,
        image: buyNowProduct.image,
        price: buyNowProduct.price,
        countInStock: colorStockForBuyNow,
        qty: buyNowQty,
        color: buyNowColor,
        weight: buyNowProduct.weight || 0,
      }
      setBuyNowItem(singleItem)
      setSelectedCartItems([buyNowProductId])
    }
  }, [isBuyNow, buyNowProductId, productLoading, buyNowProduct, buyNowQty, buyNowColor])

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const def = addresses.find((a) => a.isDefault) || addresses[0]
      setSelectedAddress(def)
    }
  }, [addresses, selectedAddress])

  const deliveryMethodRef = React.useRef(deliveryMethod)
  useEffect(() => {
    deliveryMethodRef.current = deliveryMethod
  }, [deliveryMethod])

  useEffect(() => {
    if (quotes.length > 0) {
      const currentExists = quotes.some(
        (q) => `${q.carrier}:${q.serviceCode}` === deliveryMethodRef.current
      )
      if (!currentExists) {
        setDeliveryMethod(`${quotes[0].carrier}:${quotes[0].serviceCode}`)
      }
    }
  }, [quotes])

  useEffect(() => {
    const effectiveCartItems = isBuyNow && buyNowItem
      ? [buyNowItem]
      : cartItems.filter((item) =>
          // selectedCartItems có thể là [{product, color}] (đúng chuẩn hiện tại)
          selectedCartItems.some(
            (sel) =>
              typeof sel === 'object'
                ? sel.product === item.product && sel.color === (item.color || '')
                : sel === item.product
          )
        )

    if (!selectedAddress || effectiveCartItems.length === 0) return
    // Chặn race condition lần đầu vào checkout từ cart
    if (!isBuyNow && !selectedCartItemsLoaded) return

    const toAddress = {
      province: selectedAddress.province || '',
      district: selectedAddress.district || '',
      ward: selectedAddress.ward || '',
      detail: selectedAddress.detail || '',

      // GHN resolver hỗ trợ cả tên lẫn id/code
      districtId: selectedAddress.ghnDistrictId || selectedAddress.districtId,
      wardCode: selectedAddress.ghnWardCode || selectedAddress.wardCode,
    }

    const t = setTimeout(() => {
      dispatch(getShippingQuotes(effectiveCartItems, toAddress))
    }, 400)
    return () => clearTimeout(t)
  }, [dispatch, selectedAddress, cartItems, selectedCartItems, selectedCartItemsLoaded, isBuyNow, buyNowItem])


  useEffect(() => {
    if (success && order) {
      localStorage.removeItem('selectedCartItems')
      history.push(`/order/${order._id}`)
    }
  }, [success, order, history])

  const effectiveCartItems = isBuyNow && buyNowItem
    ? [buyNowItem]
    : cartItems.filter((item) =>
        // ── MỚI: selectedCartItems là [{product, color}] objects
        selectedCartItems.some(
          (sel) =>
            (typeof sel === 'object'
              ? sel.product === item.product && sel.color === (item.color || '')
              : sel === item.product) // fallback nếu vẫn là string cũ
        )
      )

  const itemsPrice = effectiveCartItems.reduce((acc, item) => acc + item.qty * item.price, 0)

  const selectedQuote =
    quotes.find((q) => `${q.carrier}:${q.serviceCode}` === deliveryMethod) ||
    quotes[0] ||
    { carrier: 'fallback', serviceCode: 'fallback', fee: 30000, serviceName: 'Phí vận chuyển tạm tính', etaLabel: null }

  const deliveryFee = Number(selectedQuote.fee || 0)

  // MỚI: freeship giảm vào phí ship (giới hạn bởi deliveryFee), percent/fixed giảm vào tạm tính
  const discountAmount =
    selectedVoucher?.type === 'freeship'
      ? Math.min(voucherDiscount, deliveryFee)
      : Math.min(voucherDiscount, Number(itemsPrice) || 0)

  const totalPrice = itemsPrice + deliveryFee - discountAmount

  // MỚI: nhận voucher được chọn/xác nhận từ popup VoucherModal
  const handleVoucherConfirm = (voucher) => {
    if (!voucher) {
      setSelectedVoucher(null)
      dispatch(saveVoucherCode(''))
      dispatch(saveVoucherDiscount(0))
      return
    }
    setSelectedVoucher(voucher)
    setVoucherNotice('')
    dispatch(saveVoucherCode(voucher.code))
    dispatch(saveVoucherDiscount(Number(voucher.discountAmount) || 0))
  }

  // MỚI (VIII): tự động kiểm tra lại điều kiện voucher mỗi khi giỏ hàng
  // thay đổi (tạm tính hoặc phí ship đổi) — nếu voucher đang áp dụng
  // không còn đủ điều kiện, tự động bỏ áp dụng + thông báo cho khách.
  const voucherRecheckKey = `${selectedVoucher?.code || ''}:${itemsPrice}:${deliveryFee}`
  const prevRecheckKey = useRef(voucherRecheckKey)
  useEffect(() => {
    if (!selectedVoucher?.code) return
    if (prevRecheckKey.current === voucherRecheckKey) return
    prevRecheckKey.current = voucherRecheckKey

    dispatch(
      validateVoucherCode({
        code: selectedVoucher.code,
        orderAmount: itemsPrice,
        shippingFee: deliveryFee,
      })
    )
      .then((result) => {
        // Cập nhật lại discountAmount theo giỏ hàng mới (có thể tăng/giảm)
        setSelectedVoucher((prev) =>
          prev ? { ...prev, discountAmount: result.discountAmount } : prev
        )
        dispatch(saveVoucherDiscount(Number(result.discountAmount) || 0))
      })
      .catch((err) => {
        setSelectedVoucher(null)
        dispatch(saveVoucherCode(''))
        dispatch(saveVoucherDiscount(0))
        setVoucherNotice('Voucher không còn đủ điều kiện sử dụng.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherRecheckKey])


  const placeOrderHandler = () => {
    if (!agreeTerms) { alert('Vui lòng đồng ý với điều khoản!'); return }
    if (!selectedAddress) { alert('Vui lòng chọn địa chỉ giao hàng!'); return }
    if (effectiveCartItems.length === 0) { alert('Không có sản phẩm nào được chọn!'); return }

    dispatch(saveDeliveryMethod(deliveryMethod))
    dispatch(saveDeliveryProvider(selectedQuote.carrier))
    dispatch(saveDeliveryFee(deliveryFee))
    dispatch(savePaymentMethod(paymentMethod))
    dispatch(saveShopMessage(shopMessage))

      dispatch(createOrder({
      orderItems: effectiveCartItems.map((item) => ({
        name:    item.name,
        qty:     item.qty,
        image:   item.image,
        price:   item.price,
        product: item.product,
        weight:  item.weight || 0,
        color:   item.color || '',   // ── MỚI: lưu màu vào đơn hàng
      })),
      shippingAddress: {
        fullName: selectedAddress.fullName || userInfo.name,
        phone: selectedAddress.phone || userInfo.phone || '',
        province: selectedAddress.province || '',
        district: selectedAddress.district || '',
        ward: selectedAddress.ward || '',
        detail: selectedAddress.detail || '',
        ghnDistrictId: selectedAddress.ghnDistrictId || selectedAddress.districtId || null,
        ghnWardCode: selectedAddress.ghnWardCode || selectedAddress.wardCode || '',
      },
      paymentMethod,
      deliveryMethod: selectedQuote.carrier || 'fallback',
      shippingProvider: selectedQuote.carrier || '',
      shippingServiceCode: selectedQuote.serviceCode || '',
      shippingServiceName: selectedQuote.serviceName || '',
      shippingEtaDate: selectedQuote.etaDate || null,
      deliveryFee,
      itemsPrice,
      voucherDiscount: discountAmount,
      totalPrice,
      shopMessage,
      voucherCode: selectedVoucher?.code || '',
      // ── Lưu mã CK để SePay / admin đối soát ──
      transferContent,
    }))
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

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to='/cart' style={{
          color: '#33FFCC', textDecoration: 'none',
          border: '1px solid #33FFCC', borderRadius: '8px',
          padding: '6px 16px', fontSize: '14px',
        }}>
          <i className='fas fa-arrow-left me-2'></i>Giỏ hàng
        </Link>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.6rem' }}>
          <i className='fas fa-clipboard-list me-2' style={{ color: '#33FFCC' }}></i>
          Đặt Hàng
        </h2>
      </div>

      {error && (
        <Message variant='danger'>
          {error}
          {/* MỚI (B8): nếu lỗi do giá thay đổi (vd Flash Sale hết hạn) → gợi ý quay lại giỏ hàng để đồng bộ giá */}
          {error.includes('Giá của') && error.includes('đã thay đổi') && (
            <>
              {' '}
              <span
                onClick={() => history.push('/cart')}
                style={{ textDecoration: 'underline', cursor: 'pointer', color: '#33FFCC', fontWeight: '600' }}
              >
                Quay lại giỏ hàng
              </span>
            </>
          )}
        </Message>
      )}

      <Row className='g-4'>
        <Col lg={8}>

          {/* 1. ĐỊA CHỈ GIAO HÀNG */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ color: '#33FFCC', fontWeight: '700', margin: 0 }}>
                <i className='fas fa-map-marker-alt me-2'></i>Địa chỉ giao hàng
              </h5>
              <button onClick={() => setShowAddressList(!showAddressList)} style={{
                background: 'transparent', border: '1px solid #33FFCC',
                color: '#33FFCC', borderRadius: '8px',
                padding: '4px 14px', fontSize: '13px', cursor: 'pointer',
              }}>
                Thay đổi
              </button>
            </div>

            {selectedAddress ? (
              <div style={{
                background: 'rgba(51,255,204,0.06)', borderRadius: '12px',
                padding: '16px', border: '1px solid rgba(51,255,204,0.2)',
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <div style={labelStyle}>Họ tên</div>
                    <div style={valueStyle}>{selectedAddress.fullName || userInfo?.name}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Số điện thoại</div>
                    <div style={valueStyle}>{selectedAddress.phone || '—'}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={labelStyle}>Địa chỉ</div>
                    <div style={valueStyle}>{formatAddress(selectedAddress) || '—'}</div>
                  </div>
                  {selectedAddress.isDefault && (
                    <span style={{
                      background: 'rgba(51,255,204,0.15)', color: '#33FFCC',
                      border: '1px solid #33FFCC', borderRadius: '20px',
                      padding: '2px 12px', fontSize: '12px', alignSelf: 'center',
                    }}>
                      Mặc định
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Message>
                Bạn chưa có địa chỉ.{' '}
                <Link to='/addresslist' style={{ color: '#33FFCC' }}>Thêm địa chỉ</Link>
              </Message>
            )}

            {showAddressList && addresses.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {addresses.map((addr) => (
                  <div key={addr._id}
                    onClick={() => { setSelectedAddress(addr); setShowAddressList(false) }}
                    style={{
                      background: selectedAddress?._id === addr._id ? 'rgba(51,255,204,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedAddress?._id === addr._id ? '#33FFCC' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '10px', padding: '12px 16px',
                      marginBottom: '8px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#ffffff', fontWeight: '600', marginRight: '12px' }}>
                          {addr.fullName || userInfo?.name}
                        </span>
                        <span style={{ color: '#b8bcc8', fontSize: '13px' }}>{addr.phone}</span>
                        <div style={{ color: '#b8bcc8', fontSize: '13px', marginTop: '4px' }}>
                          {formatAddress(addr)}
                        </div>
                      </div>
                      {addr.isDefault && (
                        <span style={{ color: '#33FFCC', fontSize: '12px', flexShrink: 0, marginLeft: '12px' }}>
                          Mặc định
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. SẢN PHẨM */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-bolt me-2' style={isBuyNow ? { color: '#33FFCC' } : {}}></i>
              {isBuyNow ? 'Mua Ngay' : 'Sản phẩm'} ({effectiveCartItems.length})
            </h5>
            {effectiveCartItems.map((item, index) => (
              <div key={item.product} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '12px 0',
                borderBottom: index < effectiveCartItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <img src={item.image} alt={item.name} style={{
                  width: '70px', height: '70px', objectFit: 'contain',
                  background: '#0f0f23', borderRadius: '10px', padding: '6px',
                  border: '1px solid rgba(51,255,204,0.15)', flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                    {item.name}
                  </div>
                  {/* ── MỚI: hiển thị màu đã chọn ── */}
                  {item.color && (
                    <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '2px' }}>
                      Màu: <span style={{ color: '#33FFCC' }}>{item.color}</span>
                    </div>
                  )}
                  <div style={{ color: '#b8bcc8', fontSize: '13px' }}>x{item.qty}</div>
                </div>
                <span style={{ color: '#33FFCC', fontWeight: '700', fontSize: '15px', flexShrink: 0 }}>
                  {(item.qty * item.price).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
          </div>

          {/* 3. VOUCHER */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-ticket-alt me-2'></i>Voucher của Shop
            </h5>

            {voucherNotice && (
              <div style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '10px' }}>
                ⚠ {voucherNotice}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                {selectedVoucher ? (
                  <div style={{ color: '#4cdb80', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className='fas fa-check-circle'></i>
                    {selectedVoucher.type === 'freeship'
                      ? 'Miễn phí vận chuyển'
                      : `Giảm ${Number(selectedVoucher.discountAmount).toLocaleString('vi-VN')}đ`}
                    {selectedVoucher.name ? ` — ${selectedVoucher.name}` : ''}
                  </div>
                ) : (
                  <div style={{ color: '#b8bcc8', fontSize: 14 }}>Chưa chọn voucher</div>
                )}
              </div>
              <button
                onClick={() => setShowVoucherModal(true)}
                style={{
                  background: 'transparent', border: '1px solid #33FFCC', borderRadius: 8,
                  padding: '8px 18px', color: '#33FFCC', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                }}
              >
                {selectedVoucher ? 'Thay đổi' : 'Chọn hoặc nhập mã'}
              </button>
            </div>
          </div>

          <VoucherModal
            show={showVoucherModal}
            onHide={() => setShowVoucherModal(false)}
            orderAmount={itemsPrice}
            shippingFee={deliveryFee}
            selectedCode={selectedVoucher?.code}
            onConfirm={handleVoucherConfirm}
          />


          {/* 4. LỜI NHẮN */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-comment-dots me-2'></i>Lời nhắn cho shop
            </h5>
            <textarea value={shopMessage} onChange={(e) => setShopMessage(e.target.value)}
              placeholder='Nhập lời nhắn cho shop (không bắt buộc)...' rows={3}
              style={{
                width: '100%', background: '#0f0f23',
                border: '1px solid rgba(51,255,204,0.4)',
                borderRadius: '10px', padding: '12px 14px',
                color: '#ffffff', fontSize: '14px', resize: 'none', outline: 'none',
              }}
            />
          </div>

          {/* 5. VẬN CHUYỂN */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ color: '#33FFCC', fontWeight: '700', margin: 0 }}>
                <i className='fas fa-truck me-2'></i>Phương thức vận chuyển
              </h5>
              <button onClick={() => setShowDeliveryOptions(!showDeliveryOptions)} style={{
                background: 'transparent', border: '1px solid #33FFCC',
                color: '#33FFCC', borderRadius: '8px',
                padding: '4px 14px', fontSize: '13px', cursor: 'pointer',
              }}>
                {showDeliveryOptions ? 'Thu gọn' : 'Thay đổi'}
              </button>
            </div>
            {quotesLoading && (
              <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '10px' }}>
                <i className='fas fa-spinner fa-spin me-2'></i>Đang cập nhật phí vận chuyển...
              </div>
            )}
            {quotesError && (
              <div style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '10px' }}>{quotesError}</div>
            )}
            <div style={{
              background: 'rgba(51,255,204,0.06)', border: '1px solid rgba(51,255,204,0.25)',
              borderRadius: '10px', padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ color: '#ffffff', fontWeight: '600' }}>
                  {carrierLabel(selectedQuote.carrier)}{selectedQuote.serviceName ? ` - ${selectedQuote.serviceName}` : ''}
                </span>
                {selectedQuote.etaLabel && (
                  <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: '10px' }}>{selectedQuote.etaLabel}</span>
                )}
              </div>
              <span style={{ color: '#33FFCC', fontWeight: '700' }}>{deliveryFee.toLocaleString('vi-VN')}đ</span>
            </div>
            {showDeliveryOptions && (
              <div style={{ marginTop: '12px' }}>
                {(quotes.length ? quotes : [selectedQuote]).map((opt) => {
                  const id = `${opt.carrier}:${opt.serviceCode}`
                  return (
                    <div key={id}
                      onClick={() => { setDeliveryMethod(id); setShowDeliveryOptions(false) }}
                      style={{
                        background: deliveryMethod === id ? 'rgba(51,255,204,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${deliveryMethod === id ? '#33FFCC' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '10px', padding: '12px 16px', marginBottom: '8px',
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: `2px solid ${deliveryMethod === id ? '#33FFCC' : '#555'}`,
                          background: deliveryMethod === id ? '#33FFCC' : 'transparent', flexShrink: 0,
                        }}></div>
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>
                            {carrierLabel(opt.carrier)}{opt.serviceName ? ` - ${opt.serviceName}` : ''}
                          </div>
                          <div style={{ color: '#b8bcc8', fontSize: '12px' }}>{opt.etaLabel || '—'}</div>
                        </div>
                      </div>
                      <div style={{ color: '#33FFCC', fontWeight: '700' }}>{Number(opt.fee || 0).toLocaleString('vi-VN')}đ</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 6. THANH TOÁN */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
              <i className='fas fa-credit-card me-2'></i>Phương thức thanh toán
              {selectedQuote.carrier === 'ghn' && (
                <span style={{ color: '#b8bcc8', fontSize: '13px', marginLeft: '8px' }}>
                  (Hỗ trợ COD qua <strong>GHN</strong>)
                </span>
              )}
            </h5>
            {/* ── MỚI (B1): banner cảnh báo khi tài khoản bị hạn chế COD ── */}
            {codRestricted && (
              <div style={{
                background: 'rgba(255,107,107,0.08)',
                border: '1px solid rgba(255,107,107,0.35)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '12px',
                color: '#ffb3b3',
                fontSize: '13px',
              }}>
                <i className='fas fa-lock me-2' style={{ color: '#ff6b6b' }}></i>
                Tài khoản của bạn tạm thời <strong>không thể thanh toán khi nhận hàng (COD)</strong> do có nhiều lần
                giao hàng thất bại trước đó. Vui lòng chọn <strong>Chuyển khoản / QR Code</strong>. COD sẽ tự động
                mở lại sau khi bạn nhận hàng thành công đơn tiếp theo.
              </div>
            )}
            {[
              { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', icon: 'fas fa-money-bill-wave' },
              { id: 'online', label: 'Chuyển khoản / QR Code', icon: 'fas fa-qrcode' },
            ].map((opt) => {
              const isDisabled = opt.id === 'cod' && codRestricted
              return (
              <div key={opt.id}>
                <div
                  onClick={() => !isDisabled && setPaymentMethod(opt.id)}
                  style={{
                    background: paymentMethod === opt.id ? 'rgba(51,255,204,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${paymentMethod === opt.id ? '#33FFCC' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${paymentMethod === opt.id ? '#33FFCC' : '#555'}`,
                      background: paymentMethod === opt.id ? '#33FFCC' : 'transparent',
                      flexShrink: 0,
                    }}
                  ></div>
                  <i
                    className={isDisabled ? 'fas fa-lock' : opt.icon}
                    style={{
                      color: paymentMethod === opt.id ? '#33FFCC' : '#b8bcc8',
                      width: '20px',
                    }}
                  ></i>
                  <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>{opt.label}</span>
                  {isDisabled && (
                    <span style={{ color: '#ff6b6b', fontSize: '12px', marginLeft: 'auto' }}>Tạm khóa</span>
                  )}
                </div>

                {/* ── Thông báo QR sẽ hiện sau khi đặt hàng ── */}
                {paymentMethod === opt.id && opt.id === 'online' && (
                  <div style={{
                    background: 'rgba(51,255,204,0.06)',
                    border: '1px solid rgba(51,255,204,0.2)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    marginTop: '-4px',
                    color: '#b8bcc8',
                    fontSize: '13px',
                  }}>
                    <i className='fas fa-qrcode me-2' style={{ color: '#33FFCC' }}></i>
                    Mã QR thanh toán sẽ hiển thị sau khi bạn nhấn{' '}
                    <strong style={{ color: '#33FFCC' }}>Đặt Hàng</strong>
                  </div>
                )}
              </div>
              )
            })}
          </div>

        </Col>

        {/* CỘT PHẢI */}
        <Col lg={4}>
          <div style={{
            background: '#1a1a2e', borderRadius: '16px',
            border: '1px solid rgba(51,255,204,0.35)',
            padding: '24px', position: 'sticky', top: '100px',
          }}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '20px' }}>Chi tiết thanh toán</h5>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Tổng tiền hàng</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{itemsPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Phí vận chuyển</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>
                {quotesLoading ? '...' : `${deliveryFee.toLocaleString('vi-VN')}đ`}
              </span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#b8bcc8', fontSize: '14px' }}>Giảm giá</span>
                <span style={{ color: '#4cdb80', fontWeight: '600' }}>-{discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }}></div>

            <div style={{
              background: 'rgba(51,255,204,0.08)', border: '2px solid #33FFCC',
              borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '20px',
            }}>
              <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '4px' }}>Tổng thanh toán</div>
              <div style={{ color: '#33FFCC', fontSize: '1.8rem', fontWeight: '700' }}>
                {quotesLoading ? '...' : `${totalPrice.toLocaleString('vi-VN')}đ`}
              </div>
            </div>

            {/* ĐIỀU KHOẢN */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              marginBottom: '20px', padding: '12px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
            }}>
              <input
                type='checkbox'
                id='terms'
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{
                  marginTop: '3px', accentColor: '#33FFCC',
                  width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label
                  htmlFor='terms'
                  style={{ color: '#b8bcc8', fontSize: '13px', cursor: 'pointer', lineHeight: '1.5', margin: 0 }}
                >
                  Tôi đồng ý với điều khoản và chính sách của cửa hàng HariShop
                </label>
                <span
                  onClick={() => setShowTermsModal(true)}
                  style={{
                    color: '#33FFCC', textDecoration: 'underline',
                    fontWeight: '700', fontSize: '13px',
                    cursor: 'pointer', width: 'fit-content',
                  }}
                >
                  <i className='fas fa-file-contract me-1'></i>
                  Xem điều khoản và chính sách
                </span>
              </div>
            </div>

            {loading ? <Loader /> : (
              <button
                onClick={placeOrderHandler}
                disabled={effectiveCartItems.length === 0 || !agreeTerms || !selectedAddress}
                style={{
                  width: '100%',
                  background: (effectiveCartItems.length === 0 || !agreeTerms || !selectedAddress)
                    ? '#444' : '#33FFCC',
                  border: 'none', borderRadius: '12px', padding: '16px',
                  color: '#0f0f23', fontWeight: '700', fontSize: '17px',
                  cursor: (effectiveCartItems.length === 0 || !agreeTerms || !selectedAddress)
                    ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <i className='fas fa-check-circle me-2'></i>
                Đặt Hàng • {totalPrice.toLocaleString('vi-VN')}đ
              </button>
            )}

            {!agreeTerms && (
              <p style={{ color: '#ff6b6b', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                Vui lòng đồng ý điều khoản để đặt hàng
              </p>
            )}
          </div>
        </Col>
      </Row>

      <TermsModal
        show={showTermsModal}
        onHide={() => setShowTermsModal(false)}
      />
    </div>
  )
}

export default CheckoutScreen