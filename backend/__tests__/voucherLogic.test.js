// ══════════════════════════════════════════════════════════════════
// Test applyVoucherLogic (backend/controllers/voucherController.js) —
// đây là hàm QUYẾT ĐỊNH voucher có hợp lệ không và giảm bao nhiêu tiền,
// dùng cả lúc khách áp mã lẫn lúc backend re-validate trước khi tạo đơn
// (chống gian lận sửa số giảm giá từ frontend). Vì là "nguồn xác thực
// cuối cùng" của toàn bộ tính năng voucher, đây là chỗ đáng test nhất.
// ══════════════════════════════════════════════════════════════════
import { jest } from '@jest/globals'
import { applyVoucherLogic } from '../controllers/voucherController.js'

const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 ngày
const pastDate = () => new Date(Date.now() - 24 * 60 * 60 * 1000) // hôm qua

const baseVoucher = (overrides = {}) => ({
  code: 'TEST10',
  type: 'percent',
  value: 10,
  minOrder: 100000,
  maxDiscount: 0,
  usageLimit: 0,
  usedCount: 0,
  perUserLimit: 1,
  usedBy: [],
  applicableCategories: [],
  isActive: true,
  startsAt: null,
  expiresAt: futureDate(),
  ...overrides,
})

describe('applyVoucherLogic — loại giảm giá', () => {
  test('percent: giảm đúng % trên đơn hàng', () => {
    const result = applyVoucherLogic({ voucher: baseVoucher({ value: 10 }), orderAmount: 1000000 })
    expect(result.ok).toBe(true)
    expect(result.discountAmount).toBe(100000) // 10% của 1.000.000
  })

  test('percent: bị chặn bởi maxDiscount', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ value: 50, maxDiscount: 50000 }),
      orderAmount: 1000000,
    })
    expect(result.ok).toBe(true)
    expect(result.discountAmount).toBe(50000) // đáng lẽ 500.000 nhưng bị trần ở 50.000
  })

  test('fixed: giảm đúng số tiền cố định', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ type: 'fixed', value: 50000 }),
      orderAmount: 1000000,
    })
    expect(result.discountAmount).toBe(50000)
  })

  test('fixed: không giảm quá tổng tiền đơn hàng (đơn nhỏ hơn mức giảm)', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ type: 'fixed', value: 500000, minOrder: 0 }),
      orderAmount: 100000,
    })
    expect(result.ok).toBe(true)
    expect(result.discountAmount).toBe(100000) // không được giảm nhiều hơn 100.000
  })

  test('freeship: giảm đúng bằng phí ship khi không có trần', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ type: 'freeship', value: 0, minOrder: 0 }),
      orderAmount: 500000,
      shippingFee: 35000,
    })
    expect(result.discountAmount).toBe(35000)
  })

  test('freeship: bị chặn bởi trần giảm tối đa', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ type: 'freeship', value: 20000, minOrder: 0 }),
      orderAmount: 500000,
      shippingFee: 35000,
    })
    expect(result.discountAmount).toBe(20000)
  })

  test('freeship: không vượt quá phí ship thực tế dù value cao hơn', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ type: 'freeship', value: 100000, minOrder: 0 }),
      orderAmount: 500000,
      shippingFee: 25000,
    })
    expect(result.discountAmount).toBe(25000)
  })
})

describe('applyVoucherLogic — điều kiện từ chối', () => {
  test('từ chối khi đơn chưa đạt minOrder', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ minOrder: 500000 }),
      orderAmount: 300000,
    })
    expect(result.ok).toBe(false)
  })

  test('từ chối khi voucher đã hết hạn', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ expiresAt: pastDate() }),
      orderAmount: 1000000,
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/hết hạn/)
  })

  test('từ chối khi voucher chưa tới ngày bắt đầu', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ startsAt: futureDate() }),
      orderAmount: 1000000,
    })
    expect(result.ok).toBe(false)
  })

  test('từ chối khi voucher bị tắt (isActive=false)', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ isActive: false }),
      orderAmount: 1000000,
    })
    expect(result.ok).toBe(false)
  })

  test('từ chối khi hết lượt sử dụng toàn hệ thống (usageLimit)', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ usageLimit: 10, usedCount: 10 }),
      orderAmount: 1000000,
    })
    expect(result.ok).toBe(false)
  })

  test('từ chối khi user đã dùng đủ số lần cho phép (perUserLimit)', () => {
    const userId = 'user123'
    const result = applyVoucherLogic({
      voucher: baseVoucher({ perUserLimit: 1, usedBy: [{ user: userId }] }),
      orderAmount: 1000000,
      userId,
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/đã sử dụng/)
  })

  test('cho phép user KHÁC dùng dù user kia đã dùng hết lượt', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ perUserLimit: 1, usedBy: [{ user: 'user123' }] }),
      orderAmount: 1000000,
      userId: 'user456',
    })
    expect(result.ok).toBe(true)
  })

  test('perUserLimit=0 nghĩa là không giới hạn theo user', () => {
    const userId = 'user123'
    const result = applyVoucherLogic({
      voucher: baseVoucher({ perUserLimit: 0, usedBy: [{ user: userId }, { user: userId }, { user: userId }] }),
      orderAmount: 1000000,
      userId,
    })
    expect(result.ok).toBe(true)
  })

  test('từ chối khi danh mục sản phẩm trong giỏ không khớp applicableCategories', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ applicableCategories: ['Điện thoại'] }),
      orderAmount: 1000000,
      categories: ['Phụ kiện'],
    })
    expect(result.ok).toBe(false)
  })

  test('cho phép khi 1 trong các danh mục giỏ hàng khớp applicableCategories', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ applicableCategories: ['Điện thoại', 'Phụ kiện'] }),
      orderAmount: 1000000,
      categories: ['Phụ kiện', 'Ốp lưng'],
    })
    expect(result.ok).toBe(true)
  })

  test('applicableCategories rỗng = áp dụng cho mọi danh mục', () => {
    const result = applyVoucherLogic({
      voucher: baseVoucher({ applicableCategories: [] }),
      orderAmount: 1000000,
      categories: ['Bất kỳ danh mục nào'],
    })
    expect(result.ok).toBe(true)
  })
})