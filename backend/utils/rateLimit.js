// ══════════════════════════════════════════════════════════════════
// Rate limiter đơn giản, lưu trong bộ nhớ (production nhiều instance nên
// chuyển sang Redis). MỞ RỘNG: trước đây hàm này CỨNG cho mỗi "quên mật
// khẩu" (khóa cố định `forgot_${ip}`, giới hạn cố định 3 lần/giờ). Giờ
// tổng quát hóa để dùng chung cho MỌI mục đích cần giới hạn (đăng nhập,
// đăng ký, quên mật khẩu...) — mỗi nơi gọi tự đặt khóa và giới hạn riêng.
// ══════════════════════════════════════════════════════════════════

const rateLimitMap = new Map()

/**
 * @param {string} key         khóa định danh duy nhất cho hành động đang giới hạn
 *                             (VD: `login_${ip}_${email}`, `forgot_${ip}`)
 * @param {number} max         số lần tối đa được phép trong khoảng thời gian windowMs
 * @param {number} windowMs    độ dài cửa sổ thời gian tính bằng mili-giây
 * @returns {boolean}          true = còn được phép, false = đã vượt giới hạn
 */
export const checkRateLimit = (key, max = 3, windowMs = 60 * 60 * 1000) => {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= max) {
    return false
  }

  record.count += 1
  return true
}

// MỚI: cho phép XÓA giới hạn của 1 khóa ngay khi hành động đó THÀNH CÔNG
// (VD: đăng nhập đúng mật khẩu) — tránh trường hợp người dùng hợp lệ đăng
// nhập nhiều lần trong ngày rồi bỗng dưng bị chặn dù không có ý đồ xấu.
export const resetRateLimit = (key) => {
  rateLimitMap.delete(key)
}

// Dọn định kỳ các bản ghi đã hết hạn để Map không phình to vô hạn theo
// thời gian chạy server (mỗi 30 phút dọn 1 lần).
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(key)
  }
}, 30 * 60 * 1000)
// unref() — timer dọn dẹp này không được giữ tiến trình Node sống (VD:
// khi graceful-shutdown hoặc chạy trong script/test ngắn hạn).
cleanupInterval.unref?.()

export default { checkRateLimit, resetRateLimit }