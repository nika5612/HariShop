import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Loader from '../components/Loader'
import Message from '../components/Message'
import { getOrderDetails } from '../actions/orderActions'
import { trackShipping } from '../actions/shippingActions'

const carrierLabel = (carrier) => {
  switch (carrier) {
    case 'ghn': return 'GHN'
    case 'viettelpost': return 'Viettel Post'
    case 'ghtk': return 'GHTK'
    case 'fallback': return 'Tạm tính'
    default: return carrier || '—'
  }
}

const TrackingScreen = ({ match }) => {
  const dispatch = useDispatch()
  const orderId = match.params.id

  const orderDetails = useSelector((state) => state.orderDetails)
  const { order, loading: orderLoading, error: orderError } = orderDetails

  const shippingTrack = useSelector((state) => state.shippingTrack)
  const { loading: trackLoading, error: trackError, events = [], available, reason } = shippingTrack

  const [manualCarrier, setManualCarrier] = useState('ghn')
  const [manualTrackingId, setManualTrackingId] = useState('')

  useEffect(() => {
    if (orderId) dispatch(getOrderDetails(orderId))
  }, [dispatch, orderId])

  useEffect(() => {
    if (order?.shippingProvider && order?.shippingTrackingId) {
      dispatch(trackShipping(order.shippingProvider, order.shippingTrackingId))
    }
  }, [dispatch, order?.shippingProvider, order?.shippingTrackingId])

  const manualTrack = () => {
    if (!manualCarrier || !manualTrackingId.trim()) return
    dispatch(trackShipping(manualCarrier, manualTrackingId.trim()))
  }

  return (
    <div>
      <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Link to={orderId ? `/order/${orderId}` : '/'} style={{
          color: '#33FFCC', textDecoration: 'none',
          border: '1px solid #33FFCC', borderRadius: '8px',
          padding: '6px 16px', fontSize: '14px',
        }}>
          <i className='fas fa-arrow-left me-2'></i>Quay lại
        </Link>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.3rem' }}>
          <i className='fas fa-route me-2' style={{ color: '#33FFCC' }}></i>
          Theo dõi vận chuyển
        </h2>
      </div>

      {orderLoading && <Loader />}
      {orderError && <Message variant='danger'>{orderError}</Message>}

      {order && (
        <div style={{
          background: '#1a1a2e',
          borderRadius: '16px',
          border: '1px solid rgba(51,255,204,0.15)',
          padding: '18px 20px',
          marginBottom: '16px',
        }}>
          <div style={{ color: '#b8bcc8', fontSize: '13px' }}>Đơn hàng</div>
          <div style={{ color: '#ffffff', fontWeight: '700' }}>#{order._id}</div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#b8bcc8', fontSize: '13px' }}>Hãng</div>
              <div style={{ color: '#ffffff', fontWeight: '600' }}>{carrierLabel(order.shippingProvider)}</div>
            </div>
            <div>
              <div style={{ color: '#b8bcc8', fontSize: '13px' }}>Mã vận đơn</div>
              <div style={{ color: '#ffffff', fontWeight: '600' }}>{order.shippingTrackingId || '—'}</div>
            </div>
          </div>
          {!order.shippingTrackingId && (
            <div style={{ marginTop: '12px', color: '#ffd166', fontSize: '13px' }}>
              Chưa có mã vận đơn. Bạn có thể tra cứu thủ công bên dưới.
            </div>
          )}
        </div>
      )}

      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        border: '1px solid rgba(51,255,204,0.15)',
        padding: '18px 20px',
        marginBottom: '16px',
      }}>
        <div style={{ color: '#ffffff', fontWeight: '700', marginBottom: '10px' }}>Tra cứu thủ công</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select value={manualCarrier} onChange={(e) => setManualCarrier(e.target.value)} style={{
            background: '#0f0f23', color: '#ffffff',
            border: '1px solid rgba(51,255,204,0.25)', borderRadius: '10px',
            padding: '10px 12px',
          }}>
            <option value='ghn'>GHN</option>
            <option value='viettelpost'>Viettel Post</option>
            <option value='ghtk'>GHTK</option>
          </select>
          <input value={manualTrackingId} onChange={(e) => setManualTrackingId(e.target.value)} placeholder='Nhập mã vận đơn...'
            style={{
              flex: 1, minWidth: '220px',
              background: '#0f0f23', color: '#ffffff',
              border: '1px solid rgba(51,255,204,0.25)', borderRadius: '10px',
              padding: '10px 12px',
            }}
          />
          <button onClick={manualTrack} style={{
            background: '#33FFCC', color: '#0f0f23',
            border: 'none', borderRadius: '10px',
            padding: '10px 16px', fontWeight: '700',
          }}>
            Tra cứu
          </button>
        </div>
      </div>

      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        border: '1px solid rgba(51,255,204,0.15)',
        padding: '18px 20px',
      }}>
        <div style={{ color: '#ffffff', fontWeight: '700', marginBottom: '12px' }}>Lộ trình</div>
        {trackLoading && <Loader />}
        {trackError && <Message variant='danger'>{trackError}</Message>}
        {!trackLoading && available === false && (
          <Message variant='warning'>{reason || 'Không thể tra cứu lộ trình.'}</Message>
        )}
        {!trackLoading && (!events || events.length === 0) && !trackError && (
          <div style={{ color: '#b8bcc8', fontSize: '13px' }}>Chưa có dữ liệu tracking.</div>
        )}
        {events?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.map((ev, idx) => (
              <div key={idx} style={{
                background: 'rgba(51,255,204,0.06)',
                border: '1px solid rgba(51,255,204,0.15)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <div style={{ color: '#33FFCC', fontWeight: '700' }}>{ev.status || 'Cập nhật'}</div>
                <div style={{ color: '#ffffff', marginTop: '4px' }}>{ev.description || ''}</div>
                <div style={{ color: '#b8bcc8', fontSize: '12px', marginTop: '6px' }}>
                  {[ev.location, ev.time ? new Date(ev.time).toLocaleString('vi-VN') : null].filter(Boolean).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackingScreen