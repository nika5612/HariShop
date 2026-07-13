import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useHistory } from 'react-router-dom'
import { removeFromCompare, clearCompare } from '../actions/compareActions'
import { COMPARE_MAX_ITEMS } from '../constants/compareConstants'

// ═══════════════════ B7: Thanh so sánh nổi ═══════════════════
// Hiện ở dưới màn hình bất cứ khi nào có >=1 sản phẩm được chọn để so sánh.
// Ẩn ở khu vực Admin và ngay trên trang so sánh (không cần thiết ở đó).

const CompareBar = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const location = useLocation()

  const compareItems = useSelector((state) => state.compare.compareItems)

  if (location.pathname.startsWith('/admin')) return null
  if (location.pathname === '/compare') return null
  if (!compareItems || compareItems.length === 0) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1040,
      background: '#1a1a2e', borderTop: '1px solid rgba(51,255,204,0.35)',
      boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
    }}>
      <div style={{ color: '#b8bcc8', fontSize: '13px', whiteSpace: 'nowrap' }}>
        <i className='fas fa-balance-scale me-2' style={{ color: '#33FFCC' }}></i>
        So sánh ({compareItems.length}/{COMPARE_MAX_ITEMS})
      </div>

      <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
        {compareItems.map((item) => (
          <div key={item._id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(51,255,204,0.2)',
            borderRadius: '10px', padding: '4px 10px 4px 4px',
          }}>
            <img src={item.image} alt={item.name} style={{
              width: '32px', height: '32px', objectFit: 'contain',
              background: '#0f0f23', borderRadius: '6px', padding: '2px',
            }} />
            <span style={{
              color: '#eef0f7', fontSize: '12px', maxWidth: '120px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.name}
            </span>
            <button
              onClick={() => dispatch(removeFromCompare(item._id))}
              style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}
            >
              <i className='fas fa-times'></i>
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={() => dispatch(clearCompare())}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: '#b8bcc8', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Xóa tất cả
        </button>
        <button
          onClick={() => history.push('/compare')}
          disabled={compareItems.length < 2}
          style={{
            background: compareItems.length < 2 ? '#3a3a55' : '#33FFCC',
            color: compareItems.length < 2 ? '#8a8fa3' : '#0f0f23',
            border: 'none', borderRadius: '10px', padding: '9px 20px',
            fontSize: '13px', fontWeight: '700',
            cursor: compareItems.length < 2 ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <i className='fas fa-columns me-2'></i>Xem so sánh
        </button>
      </div>
    </div>
  )
}

export default CompareBar