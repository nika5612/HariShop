import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Loader from '../components/Loader'
import Message from '../components/Message'
import { listMyOrders } from '../actions/orderActions'

const STATUS_CONFIG = {
  cancelled: { label: 'Đã hủy',       color: '#ff6b6b', icon: 'fas fa-times-circle' },
  delivered: { label: 'Đã giao',       color: '#4cdb80', icon: 'fas fa-check-circle' },
  paid:      { label: 'Đã thanh toán', color: '#4cdb80', icon: 'fas fa-check-circle' },
  pending:   { label: 'Đang giao',     color: '#ffd166', icon: 'fas fa-truck'         },
  unpaid:    { label: 'Chưa TT',       color: '#ff6b6b', icon: 'fas fa-clock'         },
  cancel_req:{ label: 'Chờ duyệt hủy', color: '#ffd166', icon: 'fas fa-hourglass-half'},
}

const PAYMENT_LABELS = {
  cod:         'COD',
  momo:        'MoMo',
  vietcombank: 'Vietcombank',
}

const Badge = ({ cfg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: `${cfg.color}18`, border: `1px solid ${cfg.color}55`,
    color: cfg.color, borderRadius: '20px',
    padding: '3px 10px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
  }}>
    <i className={cfg.icon}></i> {cfg.label}
  </span>
)

/* eslint-disable no-unused-vars */
const MyOrderScreen = ({ history }) => {
  // itemsPrice - referenced for future total breakdown display
  const itemsPrice = 0;
  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const orderListMy = useSelector((state) => state.orderListMy)
  const { loading, error, orders = [] } = orderListMy

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
      return
    }
    dispatch(listMyOrders())
  }, [dispatch, history, userInfo])

  const getOrderStatus = (order) => {
    if (order.isCancelled) return STATUS_CONFIG.cancelled
    if (order.cancelRequest?.requested) return STATUS_CONFIG.cancel_req
    if (order.isDelivered) return STATUS_CONFIG.delivered
    return STATUS_CONFIG.pending
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link to='/profile' style={{
          color: '#33FFCC', textDecoration: 'none',
          border: '1px solid #33FFCC', borderRadius: '8px',
          padding: '6px 16px', fontSize: '14px',
        }}>
          <i className='fas fa-arrow-left me-2'></i>Hồ sơ
        </Link>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.5rem' }}>
          <i className='fas fa-shopping-bag me-2' style={{ color: '#33FFCC' }}></i>
          Đơn hàng của tôi
        </h2>
        {!loading && orders.length > 0 && (
          <span style={{
            marginLeft: 'auto', background: 'rgba(51,255,204,0.1)',
            border: '1px solid rgba(51,255,204,0.3)', color: '#33FFCC',
            borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: '600',
          }}>
            {orders.length} đơn hàng
          </span>
        )}
      </div>

      {loading ? <Loader /> : error ? (
        <Message variant='danger'>{error}</Message>
      ) : orders.length === 0 ? (
        <div style={{
          background: '#1a1a2e', borderRadius: '16px',
          border: '1px solid rgba(51,255,204,0.15)',
          padding: '60px 24px', textAlign: 'center',
        }}>
          <i className='fas fa-box-open' style={{ fontSize: '48px', color: '#33FFCC', opacity: 0.5, marginBottom: '16px', display: 'block' }}></i>
          <p style={{ color: '#b8bcc8', fontSize: '16px', marginBottom: '20px' }}>Bạn chưa có đơn hàng nào</p>
          <Link to='/' style={{
            background: '#33FFCC', color: '#0f0f23', textDecoration: 'none',
            borderRadius: '10px', padding: '12px 28px', fontWeight: '700', fontSize: '15px',
          }}>
            <i className='fas fa-shopping-cart me-2'></i>Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => {
            const statusCfg = getOrderStatus(order)


            return (
              <div key={order._id} style={{
                background: '#1a1a2e', borderRadius: '16px',
                border: '1px solid rgba(51,255,204,0.15)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(51,255,204,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(51,255,204,0.15)'}
              >
                {/* Order header */}
                <div style={{
                  background: 'rgba(51,255,204,0.06)',
                  borderBottom: '1px solid rgba(51,255,204,0.1)',
                  padding: '12px 20px',
                  display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                }}>
                  <span style={{ color: '#b8bcc8', fontSize: '12px' }}>
                    Đơn #{order._id.substring(0, 16)}...
                  </span>
                  <span style={{ color: '#b8bcc8', fontSize: '12px' }}>
                    <i className='fas fa-calendar-alt me-1'></i>
                    {order.createdAt?.substring(0, 10)}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge cfg={statusCfg} />
                    <Badge cfg={order.isPaid ? STATUS_CONFIG.paid : STATUS_CONFIG.unpaid} />
                  </div>
                </div>

                {/* Order body */}
                <div style={{ padding: '16px 20px' }}>
                  {/* Sản phẩm preview */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {order.orderItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={item.image} alt={item.name} style={{
                          width: '52px', height: '52px', objectFit: 'contain',
                          background: '#0f0f23', borderRadius: '8px', padding: '4px',
                          border: '1px solid rgba(51,255,204,0.15)',
                        }} />
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', maxWidth: '160px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ color: '#b8bcc8', fontSize: '12px' }}>
                            x{item.qty} · {item.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.orderItems.length > 3 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '52px', height: '52px', background: 'rgba(51,255,204,0.08)',
                        borderRadius: '8px', border: '1px solid rgba(51,255,204,0.2)',
                        color: '#33FFCC', fontSize: '13px', fontWeight: '700',
                      }}>
                        +{order.orderItems.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px',
                  }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '2px' }}>Thanh toán</div>
                        <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600' }}>
                          <i className={`fas fa-${order.paymentMethod === 'cod' ? 'money-bill-wave' : order.paymentMethod === 'momo' ? 'wallet' : 'university'} me-1`}
                            style={{ color: '#33FFCC' }}></i>
                          {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#b8bcc8', fontSize: '12px', marginBottom: '2px' }}>Tổng tiền</div>
                        <div style={{ color: '#33FFCC', fontSize: '15px', fontWeight: '700' }}>
                          {order.totalPrice?.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>

                    <Link to={`/order/${order._id}`} style={{
                      background: '#33FFCC', color: '#0f0f23', textDecoration: 'none',
                      borderRadius: '10px', padding: '10px 22px',
                      fontWeight: '700', fontSize: '14px',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                    }}>
                      <i className='fas fa-eye'></i> Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyOrderScreen