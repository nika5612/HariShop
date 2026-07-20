// ══════════════════════════════════════════════════════════════════
// Test checkRateLimit/resetRateLimit (backend/utils/rateLimit.js) — dùng
// chống brute-force đăng nhập, chống spam đăng ký, giới hạn quên mật khẩu.
// ══════════════════════════════════════════════════════════════════
import { checkRateLimit, resetRateLimit } from '../utils/rateLimit.js'

describe('checkRateLimit', () => {
  test('cho phép đến đúng giới hạn max, chặn từ lần vượt quá', () => {
    const key = `test_${Date.now()}_${Math.random()}` // khoá riêng mỗi test, tránh ảnh hưởng nhau
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000)).toBe(true)
    }
    expect(checkRateLimit(key, 5, 60_000)).toBe(false) // lần thứ 6 phải bị chặn
  })

  test('resetRateLimit mở khoá ngay lập tức, không cần chờ hết hạn', () => {
    const key = `test_reset_${Date.now()}_${Math.random()}`
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000)
    expect(checkRateLimit(key, 3, 60_000)).toBe(false)

    resetRateLimit(key)
    expect(checkRateLimit(key, 3, 60_000)).toBe(true)
  })

  test('2 khoá khác nhau (VD 2 cặp IP+email khác nhau) không ảnh hưởng lẫn nhau', () => {
    const keyA = `test_a_${Date.now()}`
    const keyB = `test_b_${Date.now()}`
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000)
    expect(checkRateLimit(keyA, 5, 60_000)).toBe(false)
    expect(checkRateLimit(keyB, 5, 60_000)).toBe(true) // khoá khác, chưa từng gọi → vẫn cho phép
  })

  test('tự động mở lại sau khi hết windowMs (mô phỏng bằng windowMs rất ngắn)', async () => {
    const key = `test_window_${Date.now()}`
    checkRateLimit(key, 1, 50) // windowMs = 50ms
    expect(checkRateLimit(key, 1, 50)).toBe(false) // ngay lập tức vẫn còn bị chặn

    await new Promise((resolve) => setTimeout(resolve, 80)) // chờ qua khỏi cửa sổ 50ms
    expect(checkRateLimit(key, 1, 50)).toBe(true) // đã reset tự động
  })
})