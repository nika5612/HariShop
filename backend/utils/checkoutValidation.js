import { computeFlashSale } from './flashSale.js'

// ── Validate các field bắt buộc của đơn hàng ────────────────────────────────
// Trả về { valid: true } nếu hợp lệ, hoặc { valid: false, status, message }
// với đúng status/message như code gốc để không đổi hành vi API.
export function validateOrderInput({ orderItems, shippingAddress, paymentMethod }) {
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return { valid: false, status: 400, message: 'No order items' }
  }
  if (!shippingAddress) {
    return { valid: false, status: 400, message: 'Shipping address required' }
  }

  const addr = shippingAddress
  if (!addr.fullName?.trim())  return { valid: false, status: 400, message: 'Full name required' }
  if (!addr.phone?.trim())     return { valid: false, status: 400, message: 'Phone number required' }
  if (!addr.province?.trim())  return { valid: false, status: 400, message: 'Province required' }
  if (!addr.ward?.trim())      return { valid: false, status: 400, message: 'Ward required' }
  if (!addr.detail?.trim())    return { valid: false, status: 400, message: 'Address detail required' }
  if (!paymentMethod?.trim())  return { valid: false, status: 400, message: 'Payment method required' }

  return { valid: true }
}

// ── So sánh giá thật (DB) với giá khách gửi lên ─────────────────────────────
// productMap: object { [productId]: productDoc } đã lấy sẵn từ DB (.lean()).
// Trả về mảng rỗng nếu mọi giá đều khớp; nếu không, trả về danh sách các
// sản phẩm bị lệch giá kèm giá cũ/mới để hiển thị cho khách.
export function findPriceMismatches(orderItems, productMap) {
  const mismatches = []

  for (const item of orderItems) {
    const p = productMap[item.product?.toString()]
    if (!p) continue // sản phẩm không còn tồn tại — controller tự xử lý riêng nếu cần

    const { isFlashSaleActive, salePrice } = computeFlashSale(p)
    const currentPrice = isFlashSaleActive ? salePrice : p.price

    if (currentPrice !== item.price) {
      mismatches.push({ name: item.name, oldPrice: item.price, newPrice: currentPrice })
    }
  }

  return mismatches
}

// ── Tính tổng khối lượng đơn hàng ────────────────────────────────────────────
// Ưu tiên giá trị frontend gửi lên nếu > 0 (đã tính đúng theo UI), fallback
// tự tính lại từ orderItems nếu frontend không gửi hoặc gửi giá trị <= 0.
export function computeTotalWeight(orderItems, frontendTotalWeight) {
  const computed = Array.isArray(orderItems)
    ? orderItems.reduce((sum, item) => sum + (item.weight || 0) * (item.qty || 0), 0)
    : 0

  return frontendTotalWeight > 0 ? Number(frontendTotalWeight) : computed
}

// ── Kiểm tra số tiền giảm giá frontend gửi có khớp với số backend tự tính ──
// Cho phép lệch tối đa 1đ (làm tròn số thập phân). Không tin số frontend
// gửi trực tiếp — chống gian lận sửa voucherDiscount qua DevTools/Postman.
export function voucherDiscountMatches(submittedDiscount, expectedDiscount) {
  return Math.abs(Number(submittedDiscount || 0) - expectedDiscount) <= 1
}