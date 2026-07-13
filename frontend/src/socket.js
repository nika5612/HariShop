import { io } from 'socket.io-client'

// ═══════════════════ B9: Thông báo real-time bằng Socket.io (Frontend) ═══════════════════
// Kết nối trực tiếp tới backend (không qua proxy CRA) — dùng đúng host hiện tại
// (hỗ trợ cả localhost lẫn truy cập qua IP LAN khi test trên điện thoại cùng mạng),
// cổng lấy từ REACT_APP_SOCKET_PORT nếu có, mặc định 5000 (khớp PORT của backend).
const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : `http://${window.location.hostname}:${process.env.REACT_APP_SOCKET_PORT || 5000}`

let socket = null

// Kết nối (hoặc tái sử dụng kết nối hiện có) và xác thực bằng JWT token của người dùng.
// Gọi lại hàm này mỗi khi đăng nhập/đăng xuất để cập nhật đúng phòng (room) nhận thông báo.
export const connectSocket = (token) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
  }

  const authenticate = () => {
    if (token) socket.emit('auth', token)
  }

  if (socket.connected) {
    authenticate()
  } else {
    socket.off('connect', authenticate) // tránh đăng ký trùng nếu gọi connectSocket nhiều lần
    socket.on('connect', authenticate)
    if (!socket.active) socket.connect()
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => socket