import React, { useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  listNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  listMyNotifications,
  fetchMyUnreadCount,
  markMyNotificationRead,
  markAllMyNotificationsRead,
  deleteNotification,
  deleteMyNotification,
} from '../actions/notificationActions'

const TYPE_ICON = {
  // Admin
  new_order:        { icon: 'fas fa-shopping-bag',     color: '#33FFCC' },
  order_delivered:  { icon: 'fas fa-check-circle',     color: '#4cdb80' },
  cancel_request:   { icon: 'fas fa-times-circle',     color: '#ff6b6b' },
  refund_request:   { icon: 'fas fa-hand-holding-usd', color: '#ffd166' },
  // MỚI: khách chuyển khoản SePay thiếu/thừa so với giá trị đơn
  payment_underpaid: { icon: 'fas fa-exclamation-triangle', color: '#ff6b6b' },
  payment_overpaid:  { icon: 'fas fa-coins',                color: '#ffd166' },
  // Khách hàng
  order_placed:     { icon: 'fas fa-receipt',          color: '#33FFCC' },
  order_status:     { icon: 'fas fa-box',              color: '#5eb3f6' },
  refund_completed: { icon: 'fas fa-undo',             color: '#4cdb80' },
  cancel_approved:  { icon: 'fas fa-ban',              color: '#ff6b6b' },
  cancel_rejected:  { icon: 'fas fa-shield-alt',        color: '#5eb3f6' },
}

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

// scope: 'admin' | 'customer' — quyết định dùng API/redux slice nào
const NotificationBell = ({ scope = 'admin' }) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const dispatch = useDispatch()
  const history = useHistory()

  const isAdmin = scope === 'admin'

  const { notifications, unreadCount, loading } = useSelector((state) =>
    isAdmin ? state.notification : state.myNotification
  )

  useEffect(() => {
    const fetchCount = () => dispatch(isAdmin ? fetchUnreadCount() : fetchMyUnreadCount())
    fetchCount()
    // MỚI (B9): giờ đã có Socket.io đẩy thông báo real-time (xem SocketManager.js),
    // interval này chỉ còn là LƯỚI AN TOÀN dự phòng (vd socket bị rớt mạng tạm thời) —
    // giãn ra 60s thay vì 30s vì không còn là nguồn cập nhật chính.
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) dispatch(isAdmin ? listNotifications(20) : listMyNotifications(20))
  }

  const handleClickItem = (n) => {
    if (!n.isRead) dispatch(isAdmin ? markNotificationRead(n._id) : markMyNotificationRead(n._id))
    setOpen(false)
    if (n.link) history.push(n.link)
  }

  const handleMarkAllRead = () => {
    dispatch(isAdmin ? markAllNotificationsRead() : markAllMyNotificationsRead())
  }

  // MỚI: xoá 1 thông báo — chặn sự kiện nổi bọt (stopPropagation) để không
  // vô tình kích hoạt luôn handleClickItem (đánh dấu đã đọc + điều hướng)
  // của div cha khi bấm nút xoá.
  const handleDeleteItem = (e, id) => {
    e.stopPropagation()
    dispatch(isAdmin ? deleteNotification(id) : deleteMyNotification(id))
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginRight: 8 }}>
      <button
        onClick={toggleOpen}
        aria-label='Thông báo'
        style={{
          background: 'transparent', border: 'none', position: 'relative',
          padding: '8px 10px', cursor: 'pointer', color: '#eef0f7', fontSize: 18,
        }}
      >
        <i className='fas fa-bell'></i>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ff6b6b', color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: '50%', minWidth: 16, height: 16, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, border: '2px solid #0f0f23',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: 340, maxWidth: '90vw',
          background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.25)',
          borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 15 }}>Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent', border: 'none', color: '#33FFCC',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8a8fa3', fontSize: 13 }}>
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8a8fa3', fontSize: 13 }}>
                Không có thông báo mới nhất trong tháng
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_ICON[n.type] || { icon: 'fas fa-bell', color: '#8a8fa3' }
                return (
                  <div
                    key={n._id}
                    onClick={() => handleClickItem(n)}
                    className='notification-item'
                    style={{
                      display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer',
                      background: n.isRead ? 'transparent' : 'rgba(51,255,204,0.06)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: `${cfg.color}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={cfg.icon} style={{ color: cfg.color, fontSize: 14 }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#eef0f7', fontSize: 13, fontWeight: n.isRead ? 500 : 700,
                      }}>
                        {n.title}
                      </div>
                      {n.message && (
                        <div style={{ color: '#8a8fa3', fontSize: 12, marginTop: 2 }}>
                          {n.message}
                        </div>
                      )}
                      <div style={{ color: '#6b7085', fontSize: 11, marginTop: 3 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#33FFCC',
                        flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                    {/* MỚI: nút xoá — chỉ hiện khi hover vào item (CSS .notification-item:hover) */}
                    <button
                      onClick={(e) => handleDeleteItem(e, n._id)}
                      className='notification-delete-btn'
                      aria-label='Xoá thông báo'
                      title='Xoá thông báo'
                      style={{
                        background: 'transparent', border: 'none', color: '#8a8fa3',
                        fontSize: 13, cursor: 'pointer', flexShrink: 0,
                        padding: '4px 6px', borderRadius: 6, opacity: 0,
                        transition: 'opacity 0.15s, color 0.15s, background 0.15s',
                      }}
                    >
                      <i className='fas fa-trash-alt'></i>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell