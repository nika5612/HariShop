import React, { useState, useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Loader from '../components/Loader'
import Message from '../components/Message'
import { updateUserProfile } from '../actions/userActions'
import { getUserProfile } from '../actions/userProfileActions'
import { listMyOrders } from '../actions/orderActions'
import { USER_UPDATE_PROFILE_RESET } from '../constants/userConstants'

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

const STATUS_LABEL = (order) => {
  if (order.isCancelled) return { label: 'Đã hủy', color: '#ff6b6b', icon: 'fas fa-times-circle' }
  if (order.cancelRequest?.requested) return { label: 'Chờ duyệt hủy', color: '#ffd166', icon: 'fas fa-hourglass-half' }
  if (order.isDelivered) return { label: 'Đã giao', color: '#4cdb80', icon: 'fas fa-check-circle' }
  return { label: 'Đang giao', color: '#ffd166', icon: 'fas fa-truck' }
}

const ProfileScreen = ({ history }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)

  const dispatch = useDispatch()

  const userProfile = useSelector((state) => state.userProfile)
  const { loading, error, user } = userProfile

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const userUpdateProfile = useSelector((state) => state.userUpdateProfile)
  const { success } = userUpdateProfile

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

  const submitHandler = (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Mật khẩu không khớp')
    } else {
      dispatch(updateUserProfile({ id: user._id, name, email, password }))
      dispatch({ type: USER_UPDATE_PROFILE_RESET })
    }
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

            {message && <Message variant='danger'>{message}</Message>}
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
                <div>
                  <label style={labelStyle}>Mật khẩu mới <span style={{ color: '#666', fontWeight: '400' }}>(để trống nếu không đổi)</span></label>
                  <input type='password' placeholder='Nhập mật khẩu mới' value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Xác nhận mật khẩu</label>
                  <input type='password' placeholder='Nhập lại mật khẩu mới' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
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
                  const statusCfg = STATUS_LABEL(order)
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