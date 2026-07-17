import React, { useState, useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Loader from '../components/Loader'
import Message from '../components/Message'
import PasswordInput from '../components/PasswordInput'
import {
  updateUserProfile,
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
} from '../actions/userActions'
import { getUserProfile } from '../actions/userProfileActions'
import { listMyOrders } from '../actions/orderActions'
import {
  USER_UPDATE_PROFILE_RESET,
  USER_CHANGE_PWD_REQUEST_OTP_RESET,
  USER_CHANGE_PWD_VERIFY_OTP_RESET,
} from '../constants/userConstants'
import { getOrderStatusInfo } from '../constants/orderStatusConfig'

const inputStyle = {
  background: '#0f0f23',
  border: '1px solid rgba(51,255,204,0.4)',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 16px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
}

const labelStyle = {
  color: '#b8bcc8',
  fontWeight: '500',
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
}

const sectionStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(51,255,204,0.15)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '20px',
}

// STATUS_LABEL cục bộ đã được thay bằng getOrderStatusInfo() dùng chung
// từ '../constants/orderStatusConfig' — hiển thị đủ 12 trạng thái chi tiết
// thay vì chỉ gộp chung "Đang giao".

const ProfileScreen = ({ history }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // ===== B12: Đổi mật khẩu qua OTP =====
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [pwdMessage, setPwdMessage] = useState(null)
  const [cooldown, setCooldown] = useState(0)

  const dispatch = useDispatch()

  const userProfile = useSelector((state) => state.userProfile)
  const { loading, error, user } = userProfile

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const userUpdateProfile = useSelector((state) => state.userUpdateProfile)
  const { success } = userUpdateProfile

  const userChangePasswordRequestOtp = useSelector((state) => state.userChangePasswordRequestOtp)
  const {
    loading: loadingRequestOtp,
    error: errorRequestOtp,
    success: successRequestOtp,
    data: requestOtpData,
  } = userChangePasswordRequestOtp

  const userChangePasswordVerifyOtp = useSelector((state) => state.userChangePasswordVerifyOtp)
  const {
    loading: loadingVerifyOtp,
    error: errorVerifyOtp,
    success: successVerifyOtp,
  } = userChangePasswordVerifyOtp

  const orderListMy = useSelector((state) => state.orderListMy)
  const { loading: loadingOrders, error: errorOrders, orders = [] } = orderListMy

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
      return
    }
    dispatch(getUserProfile())
    dispatch(listMyOrders())
  }, [dispatch, history, userInfo])

  useEffect(() => {
    if (user && user.name) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  // Sau khi gửi OTP thành công → hiện ô nhập OTP + bắt đầu đếm ngược cooldown gửi lại
  useEffect(() => {
    if (successRequestOtp) {
      setOtpSent(true)
      setCooldown(requestOtpData?.cooldownSeconds || 60)
    }
  }, [successRequestOtp, requestOtpData])

  // Đếm ngược cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Đổi mật khẩu thành công → reset toàn bộ form đổi mật khẩu
  useEffect(() => {
    if (successVerifyOtp) {
      setNewPassword('')
      setConfirmNewPassword('')
      setOtp('')
      setOtpSent(false)
      setCooldown(0)
      setPwdMessage(null)
    }
  }, [successVerifyOtp])

  const submitHandler = (e) => {
    e.preventDefault()
    dispatch(updateUserProfile({ id: user._id, name, email }))
    dispatch({ type: USER_UPDATE_PROFILE_RESET })
  }

  // Bước 1: gửi mã OTP về email
  const requestOtpHandler = (e) => {
    e.preventDefault()
    setPwdMessage(null)
    if (newPassword.length < 6) {
      setPwdMessage('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPwdMessage('Mật khẩu xác nhận không khớp.')
      return
    }
    dispatch({ type: USER_CHANGE_PWD_VERIFY_OTP_RESET })
    dispatch(requestChangePasswordOtp(newPassword))
  }

  // Bước 2: xác nhận OTP + thực sự đổi mật khẩu
  const verifyOtpHandler = (e) => {
    e.preventDefault()
    setPwdMessage(null)
    if (!otp.trim()) {
      setPwdMessage('Vui lòng nhập mã OTP.')
      return
    }
    dispatch(verifyChangePasswordOtp(otp.trim(), newPassword))
  }

  const cancelChangePassword = () => {
    setOtpSent(false)
    setOtp('')
    setPwdMessage(null)
    dispatch({ type: USER_CHANGE_PWD_REQUEST_OTP_RESET })
    dispatch({ type: USER_CHANGE_PWD_VERIFY_OTP_RESET })
  }

  const recentOrders = orders.slice(0, 5)

  return (
    <div>
      {/* Page title */}
      <h2 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '28px', fontSize: '1.5rem' }}>
        <i className='fas fa-user-circle me-2' style={{ color: '#33FFCC' }}></i>
        Tài khoản của tôi
      </h2>

      <Row className='g-4'>

        {/* ===== CỘT TRÁI: Form cập nhật hồ sơ ===== */}
        <Col lg={5}>

          {/* Cập nhật thông tin */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '20px' }}>
              <i className='fas fa-user-edit me-2'></i>Thông tin cá nhân
            </h5>

            {success && <Message variant='success'>Cập nhật thành công!</Message>}

            {loading ? <Loader /> : error ? <Message variant='danger'>{error}</Message> : (
              <form onSubmit={submitHandler} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Họ và tên</label>
                  <input type='text' value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
                </div>
                <button type='submit' style={{
                  background: '#33FFCC', border: 'none', color: '#0f0f23',
                  fontWeight: '700', padding: '14px', borderRadius: '10px',
                  fontSize: '15px', cursor: 'pointer', marginTop: '4px',
                }}>
                  <i className='fas fa-save me-2'></i>Lưu thay đổi
                </button>
              </form>
            )}
          </div>

          {/* MỚI (B12): Đổi mật khẩu — bắt buộc xác nhận OTP gửi qua email */}
          <div style={sectionStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '20px' }}>
              <i className='fas fa-lock me-2'></i>Đổi mật khẩu
            </h5>

            {pwdMessage && <Message variant='danger'>{pwdMessage}</Message>}
            {errorRequestOtp && <Message variant='danger'>{errorRequestOtp}</Message>}
            {errorVerifyOtp && <Message variant='danger'>{errorVerifyOtp}</Message>}
            {successVerifyOtp && <Message variant='success'>Đổi mật khẩu thành công!</Message>}

            {!otpSent ? (
              // Bước 1: nhập mật khẩu mới → gửi OTP về email
              <form onSubmit={requestOtpHandler} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Mật khẩu mới</label>
                  <PasswordInput
                    placeholder='Nhập mật khẩu mới'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Xác nhận mật khẩu mới</label>
                  <PasswordInput
                    placeholder='Nhập lại mật khẩu mới'
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                {loadingRequestOtp ? <Loader /> : (
                  <button type='submit' style={{
                    background: '#33FFCC', border: 'none', color: '#0f0f23',
                    fontWeight: '700', padding: '14px', borderRadius: '10px',
                    fontSize: '15px', cursor: 'pointer',
                  }}>
                    <i className='fas fa-paper-plane me-2'></i>Gửi mã xác nhận qua email
                  </button>
                )}
              </form>
            ) : (
              // Bước 2: nhập mã OTP nhận được qua email để xác nhận
              <form onSubmit={verifyOtpHandler} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: '#b8bcc8', fontSize: '13px', margin: 0 }}>
                  Mã OTP đã được gửi đến email <strong style={{ color: '#fff' }}>{email}</strong>.
                  Vui lòng kiểm tra hộp thư (và cả mục spam) rồi nhập mã bên dưới.
                </p>
                <div>
                  <label style={labelStyle}>Mã OTP</label>
                  <input
                    type='text'
                    placeholder='Nhập mã 6 số'
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px', fontSize: '18px', fontWeight: '700' }}
                    maxLength={6}
                  />
                </div>
                {loadingVerifyOtp ? <Loader /> : (
                  <button type='submit' style={{
                    background: '#33FFCC', border: 'none', color: '#0f0f23',
                    fontWeight: '700', padding: '14px', borderRadius: '10px',
                    fontSize: '15px', cursor: 'pointer',
                  }}>
                    <i className='fas fa-check me-2'></i>Xác nhận đổi mật khẩu
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type='button'
                    onClick={cancelChangePassword}
                    style={{
                      background: 'transparent', border: 'none', color: '#b8bcc8',
                      fontSize: '13px', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <i className='fas fa-arrow-left me-1'></i>Huỷ
                  </button>
                  <button
                    type='button'
                    disabled={cooldown > 0 || loadingRequestOtp}
                    onClick={() => dispatch(requestChangePasswordOtp(newPassword))}
                    style={{
                      background: 'transparent', border: 'none',
                      color: cooldown > 0 ? '#555' : '#33FFCC',
                      fontSize: '13px', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', padding: 0,
                    }}
                  >
                    {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quản lý địa chỉ */}
          <LinkContainer to='/addresslist' style={{ cursor: 'pointer' }}>
            <div style={{
              ...sectionStyle,
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'border-color 0.2s, background 0.2s',
              marginBottom: 0,
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(51,255,204,0.5)'
                e.currentTarget.style.background = 'rgba(51,255,204,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(51,255,204,0.15)'
                e.currentTarget.style.background = '#1a1a2e'
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                background: 'rgba(51,255,204,0.12)', border: '1px solid rgba(51,255,204,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className='fas fa-map-marker-alt' style={{ color: '#33FFCC', fontSize: '18px' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '15px', marginBottom: '3px' }}>
                  Địa chỉ giao hàng
                </div>
                <div style={{ color: '#b8bcc8', fontSize: '13px' }}>
                  Thêm, sửa hoặc xóa địa chỉ nhận hàng
                </div>
              </div>
              <i className='fas fa-chevron-right' style={{ color: '#33FFCC', fontSize: '14px', flexShrink: 0 }}></i>
            </div>
          </LinkContainer>
        </Col>

        {/* ===== CỘT PHẢI: Đơn hàng gần đây ===== */}
        <Col lg={7}>
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h5 style={{ color: '#33FFCC', fontWeight: '700', margin: 0 }}>
                <i className='fas fa-shopping-bag me-2'></i>Đơn hàng gần đây
              </h5>
              {orders.length > 0 && (
                <Link to='/myorders' style={{
                  color: '#33FFCC', textDecoration: 'none',
                  fontSize: '13px', border: '1px solid #33FFCC',
                  borderRadius: '8px', padding: '4px 14px',
                }}>
                  Xem tất cả <i className='fas fa-arrow-right ms-1'></i>
                </Link>
              )}
            </div>

            {loadingOrders ? <Loader /> : errorOrders ? (
              <Message variant='danger'>{errorOrders}</Message>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <i className='fas fa-box-open' style={{ fontSize: '40px', color: '#33FFCC', opacity: 0.4, display: 'block', marginBottom: '12px' }}></i>
                <p style={{ color: '#b8bcc8', fontSize: '14px', marginBottom: '16px' }}>Chưa có đơn hàng nào</p>
                <Link to='/' style={{
                  background: '#33FFCC', color: '#0f0f23', textDecoration: 'none',
                  borderRadius: '8px', padding: '10px 22px', fontWeight: '700', fontSize: '14px',
                }}>
                  <i className='fas fa-shopping-cart me-2'></i>Mua sắm ngay
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentOrders.map((order) => {
                  const statusCfg = getOrderStatusInfo(order)
                  return (
                    <div key={order._id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(51,255,204,0.1)',
                      borderRadius: '12px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                    }}>
                      {/* Ảnh sản phẩm đầu tiên */}
                      {order.orderItems[0] && (
                        <img src={order.orderItems[0].image} alt='' style={{
                          width: '52px', height: '52px', objectFit: 'contain',
                          background: '#0f0f23', borderRadius: '8px', padding: '4px',
                          border: '1px solid rgba(51,255,204,0.15)', flexShrink: 0,
                        }} />
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                          {order.orderItems.length > 1
                            ? `${order.orderItems[0].name} +${order.orderItems.length - 1} sản phẩm`
                            : order.orderItems[0]?.name}
                        </div>
                        <div style={{ color: '#b8bcc8', fontSize: '12px' }}>
                          {order.createdAt?.substring(0, 10)}
                        </div>
                      </div>

                      {/* Tổng tiền */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#33FFCC', fontWeight: '700', fontSize: '14px' }}>
                          {order.totalPrice?.toLocaleString('vi-VN')}đ
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: `${statusCfg.color}18`, border: `1px solid ${statusCfg.color}55`,
                          color: statusCfg.color, borderRadius: '20px',
                          padding: '2px 8px', fontSize: '11px', fontWeight: '600', marginTop: '4px',
                        }}>
                          <i className={statusCfg.icon}></i> {statusCfg.label}
                        </span>
                      </div>

                      {/* Nút chi tiết */}
                      <Link to={`/order/${order._id}`} style={{
                        background: 'transparent', border: '1px solid #33FFCC',
                        color: '#33FFCC', textDecoration: 'none',
                        borderRadius: '8px', padding: '7px 14px',
                        fontSize: '13px', fontWeight: '600', flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                      }}>
                        <i className='fas fa-eye'></i> Chi tiết
                      </Link>
                    </div>
                  )
                })}

                {/* Xem tất cả bottom */}
                {orders.length > 5 && (
                  <Link to='/myorders' style={{
                    display: 'block', textAlign: 'center',
                    color: '#33FFCC', textDecoration: 'none',
                    padding: '12px', border: '1px dashed rgba(51,255,204,0.3)',
                    borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                  }}>
                    <i className='fas fa-list me-2'></i>Xem tất cả {orders.length} đơn hàng
                  </Link>
                )}
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default ProfileScreen