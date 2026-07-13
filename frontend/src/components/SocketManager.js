import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { connectSocket, disconnectSocket } from '../socket'
import { playNotificationSound } from '../utils/notificationSound'
import { NOTIFICATION_SOCKET_NEW, MY_NOTIFICATION_SOCKET_NEW } from '../constants/notificationConstants'

// ═══════════════════ B9: Quản lý kết nối Socket.io + nhận thông báo real-time ═══════════════════
// Component "vô hình" (không render UI) — chỉ lo việc:
//   1. Kết nối/xác thực Socket.io theo trạng thái đăng nhập (userInfo)
//   2. Lắng nghe sự kiện 'notification:new' từ server → cập nhật redux NGAY LẬP TỨC
//      (không cần polling/F5) + phát âm thanh thông báo
// Gắn 1 lần duy nhất ở App.js, tương tự ChatWidget/CompareBar.

const SocketManager = () => {
  const dispatch = useDispatch()
  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (!userInfo) {
      disconnectSocket()
      return
    }

    const socket = connectSocket(userInfo.token)

    const handleNewNotification = (notification) => {
      // notification.user có giá trị → thông báo riêng cho khách hàng đó.
      // notification.user rỗng/null → thông báo dành cho Admin.
      if (notification.user) {
        dispatch({ type: MY_NOTIFICATION_SOCKET_NEW, payload: notification })
      } else {
        dispatch({ type: NOTIFICATION_SOCKET_NEW, payload: notification })
      }
      playNotificationSound()
    }

    socket.on('notification:new', handleNewNotification)

    return () => {
      socket.off('notification:new', handleNewNotification)
    }
  }, [dispatch, userInfo])

  return null
}

export default SocketManager