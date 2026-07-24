import {
  validateOrderInput,
  findPriceMismatches,
  computeTotalWeight,
  voucherDiscountMatches,
} from '../utils/checkoutValidation.js'

// ── validateOrderInput ──────────────────────────────────────────────────────
describe('validateOrderInput', () => {
  const validAddress = {
    fullName: 'Nguyễn Văn A',
    phone: '0900000000',
    province: 'TP.HCM',
    ward: 'Phường 1',
    detail: '123 Đường ABC',
  }
  const validArgs = {
    orderItems: [{ product: 'p1', qty: 1, price: 1000 }],
    shippingAddress: validAddress,
    paymentMethod: 'cod',
  }

  test('chấp nhận input hợp lệ đầy đủ', () => {
    expect(validateOrderInput(validArgs)).toEqual({ valid: true })
  })

  test('từ chối khi orderItems rỗng', () => {
    const result = validateOrderInput({ ...validArgs, orderItems: [] })
    expect(result).toEqual({ valid: false, status: 400, message: 'No order items' })
  })

  test('từ chối khi orderItems không tồn tại', () => {
    const result = validateOrderInput({ ...validArgs, orderItems: undefined })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('No order items')
  })

  test('từ chối khi orderItems không phải mảng', () => {
    const result = validateOrderInput({ ...validArgs, orderItems: 'not-an-array' })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('No order items')
  })

  test('từ chối khi thiếu shippingAddress', () => {
    const result = validateOrderInput({ ...validArgs, shippingAddress: null })
    expect(result).toEqual({ valid: false, status: 400, message: 'Shipping address required' })
  })

  test.each([
    ['fullName', 'Full name required'],
    ['phone', 'Phone number required'],
    ['province', 'Province required'],
    ['ward', 'Ward required'],
    ['detail', 'Address detail required'],
  ])('từ chối khi thiếu field địa chỉ "%s"', (field, expectedMessage) => {
    const brokenAddress = { ...validAddress, [field]: '' }
    const result = validateOrderInput({ ...validArgs, shippingAddress: brokenAddress })
    expect(result).toEqual({ valid: false, status: 400, message: expectedMessage })
  })

  test('từ chối khi field địa chỉ chỉ có khoảng trắng', () => {
    const brokenAddress = { ...validAddress, phone: '   ' }
    const result = validateOrderInput({ ...validArgs, shippingAddress: brokenAddress })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Phone number required')
  })

  test('từ chối khi thiếu paymentMethod', () => {
    const result = validateOrderInput({ ...validArgs, paymentMethod: '' })
    expect(result).toEqual({ valid: false, status: 400, message: 'Payment method required' })
  })

  test('dừng ở lỗi đầu tiên gặp phải (không phải lỗi cuối cùng)', () => {
    // Thiếu cả orderItems lẫn shippingAddress — phải báo lỗi orderItems trước
    const result = validateOrderInput({ orderItems: [], shippingAddress: null, paymentMethod: '' })
    expect(result.message).toBe('No order items')
  })
})

// ── findPriceMismatches ─────────────────────────────────────────────────────
describe('findPriceMismatches', () => {
  test('trả về mảng rỗng khi giá khớp với giá gốc (không flash sale)', () => {
    const orderItems = [{ product: 'p1', name: 'iPhone 15', price: 20000000 }]
    const productMap = { p1: { _id: 'p1', price: 20000000 } }
    expect(findPriceMismatches(orderItems, productMap)).toEqual([])
  })

  test('phát hiện lệch giá khi giá DB đã đổi', () => {
    const orderItems = [{ product: 'p1', name: 'iPhone 15', price: 20000000 }]
    const productMap = { p1: { _id: 'p1', price: 22000000 } }
    expect(findPriceMismatches(orderItems, productMap)).toEqual([
      { name: 'iPhone 15', oldPrice: 20000000, newPrice: 22000000 },
    ])
  })

  test('dùng đúng giá flash sale đang hoạt động để so sánh, không dùng giá gốc', () => {
    const now = new Date()
    const orderItems = [{ product: 'p1', name: 'iPhone 15', price: 18000000 }]
    const productMap = {
      p1: {
        _id: 'p1',
        price: 20000000,
        flashSale: {
          isActive: true,
          discountPercent: 10,
          startsAt: new Date(now.getTime() - 1000 * 60),
          endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        },
      },
    }
    // 20,000,000 * (1 - 10%) = 18,000,000 → khớp giá khách gửi → không mismatch
    expect(findPriceMismatches(orderItems, productMap)).toEqual([])
  })

  test('báo lệch giá nếu khách vẫn gửi giá flash sale nhưng flash sale đã hết hạn', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24)
    const orderItems = [{ product: 'p1', name: 'iPhone 15', price: 18000000 }]
    const productMap = {
      p1: {
        _id: 'p1',
        price: 20000000,
        flashSale: {
          isActive: true,
          discountPercent: 10,
          startsAt: new Date(past.getTime() - 1000 * 60 * 60),
          endsAt: past, // đã hết hạn
        },
      },
    }
    expect(findPriceMismatches(orderItems, productMap)).toEqual([
      { name: 'iPhone 15', oldPrice: 18000000, newPrice: 20000000 },
    ])
  })

  test('bỏ qua (không crash) khi sản phẩm không còn tồn tại trong productMap', () => {
    const orderItems = [{ product: 'p-da-xoa', name: 'Sản phẩm đã xóa', price: 1000 }]
    const productMap = {}
    expect(findPriceMismatches(orderItems, productMap)).toEqual([])
  })

  test('phát hiện đúng nhiều sản phẩm lệch giá cùng lúc, bỏ qua sản phẩm khớp giá', () => {
    const orderItems = [
      { product: 'p1', name: 'A', price: 1000 },
      { product: 'p2', name: 'B', price: 2000 }, // khớp giá
      { product: 'p3', name: 'C', price: 3000 },
    ]
    const productMap = {
      p1: { _id: 'p1', price: 1500 },
      p2: { _id: 'p2', price: 2000 },
      p3: { _id: 'p3', price: 3500 },
    }
    expect(findPriceMismatches(orderItems, productMap)).toEqual([
      { name: 'A', oldPrice: 1000, newPrice: 1500 },
      { name: 'C', oldPrice: 3000, newPrice: 3500 },
    ])
  })
})

// ── computeTotalWeight ──────────────────────────────────────────────────────
describe('computeTotalWeight', () => {
  test('ưu tiên dùng totalWeight từ frontend nếu > 0', () => {
    const orderItems = [{ weight: 100, qty: 2 }]
    expect(computeTotalWeight(orderItems, 500)).toBe(500)
  })

  test('chuyển totalWeight từ frontend thành Number (kể cả khi gửi dạng string)', () => {
    const orderItems = [{ weight: 100, qty: 1 }]
    expect(computeTotalWeight(orderItems, '750')).toBe(750)
  })

  test('tự tính lại từ orderItems nếu frontend gửi 0', () => {
    const orderItems = [{ weight: 200, qty: 3 }, { weight: 100, qty: 1 }]
    // 200*3 + 100*1 = 700
    expect(computeTotalWeight(orderItems, 0)).toBe(700)
  })

  test('tự tính lại từ orderItems nếu frontend gửi giá trị âm', () => {
    const orderItems = [{ weight: 200, qty: 2 }]
    expect(computeTotalWeight(orderItems, -50)).toBe(400)
  })

  test('tự tính lại từ orderItems nếu frontend không gửi (undefined)', () => {
    const orderItems = [{ weight: 300, qty: 2 }]
    expect(computeTotalWeight(orderItems, undefined)).toBe(600)
  })

  test('coi weight/qty thiếu là 0, không NaN/crash', () => {
    const orderItems = [{ qty: 2 }, { weight: 100 }]
    expect(computeTotalWeight(orderItems, 0)).toBe(0)
  })

  test('trả về 0 khi orderItems không phải mảng và frontend không gửi', () => {
    expect(computeTotalWeight(null, 0)).toBe(0)
  })
})

// ── voucherDiscountMatches ───────────────────────────────────────────────────
describe('voucherDiscountMatches', () => {
  test('khớp chính xác → true', () => {
    expect(voucherDiscountMatches(50000, 50000)).toBe(true)
  })

  test('lệch trong khoảng cho phép (≤ 1đ, làm tròn) → true', () => {
    expect(voucherDiscountMatches(50000.5, 50000)).toBe(true)
  })

  test('lệch vượt quá 1đ → false (khả năng gian lận sửa số FE gửi lên)', () => {
    expect(voucherDiscountMatches(60000, 50000)).toBe(false)
  })

  test('thiếu voucherDiscount (undefined) coi như 0', () => {
    expect(voucherDiscountMatches(undefined, 0)).toBe(true)
    expect(voucherDiscountMatches(undefined, 5000)).toBe(false)
  })
})