// ═══════════════════ B8: Flash Sale / giảm giá có thời hạn ═══════════════════
// "Đang diễn ra" được TÍNH TOÁN TẠI THỜI ĐIỂM ĐỌC (dựa vào giờ hiện tại so với
// startsAt/endsAt) — không cần cron job nào cả. Nhờ vậy, giá tự động "reset" về
// giá gốc ngay khi hết hạn, không cần thao tác gì thêm từ Admin.

// Kiểm tra & tính giá sau giảm cho 1 sản phẩm — dùng được cho cả mongoose
// document lẫn plain object (kết quả .lean()).
export const computeFlashSale = (product) => {
  const fs = product.flashSale

  if (!fs || !fs.isActive || !fs.discountPercent || !fs.startsAt || !fs.endsAt) {
    return { isFlashSaleActive: false }
  }

  const now = new Date()
  const start = new Date(fs.startsAt)
  const end = new Date(fs.endsAt)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || now < start || now > end) {
    return { isFlashSaleActive: false }
  }

  const discountPercent = fs.discountPercent
  const salePrice = Math.max(0, Math.round(product.price * (1 - discountPercent / 100)))

  return {
    isFlashSaleActive: true,
    discountPercent,
    salePrice,
    flashSaleEndsAt: fs.endsAt,
  }
}

// Gắn các field tính toán được (isFlashSaleActive, salePrice...) vào 1 sản phẩm
// trước khi trả về cho Frontend.
export const attachFlashSale = (product) => ({ ...product, ...computeFlashSale(product) })

// Gắn cho cả mảng sản phẩm
export const attachFlashSaleToList = (products) => (products || []).map(attachFlashSale)

// ── Xác thực & chuẩn hoá dữ liệu Flash Sale Admin nhập vào (tạo/sửa sản phẩm) ──
export const normalizeFlashSale = (input) => {
  if (!input || typeof input !== 'object') {
    return { isActive: false, discountPercent: 0, startsAt: null, endsAt: null }
  }

  const discountPercent = Math.min(90, Math.max(0, Number(input.discountPercent) || 0))
  const startsAt = input.startsAt ? new Date(input.startsAt) : null
  const endsAt = input.endsAt ? new Date(input.endsAt) : null

  let isActive = !!input.isActive
  // Nếu thiếu % giảm, hoặc thiếu ngày, hoặc ngày không hợp lệ, hoặc kết thúc <= bắt đầu
  // → tự tắt isActive để tránh lưu 1 flash sale "hỏng" (isActive nhưng thiếu dữ liệu).
  if (isActive) {
    const validDates = startsAt && endsAt && !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime())
    if (!validDates || endsAt <= startsAt || discountPercent <= 0) {
      isActive = false
    }
  }

  return { isActive, discountPercent, startsAt, endsAt }
}