import asyncHandler from 'express-async-handler'
import Voucher from '../models/voucherModel.js'

const normalizeCode = (code) => String(code || '').trim().toUpperCase()

const toVNDateOnly = (d) => {
  // Trả về YYYY-MM-DD theo giờ VN (UTC+7)
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return new Date(dt.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// MỚI: nhận thêm userId (kiểm tra perUserLimit), shippingFee (tính freeship),
// và categories (danh mục sản phẩm đang có trong giỏ, để check applicableCategories).
const applyVoucherLogic = ({ voucher, orderAmount, userId = null, shippingFee = 0, categories = [] }) => {
  const now = new Date()
  const amount = Number(orderAmount)

  if (isNaN(amount) || amount <= 0) {
    return { ok: false, message: 'Giá trị đơn hàng không hợp lệ' }
  }

  if (!voucher?.isActive) {
    return { ok: false, message: 'Mã giảm giá không còn hiệu lực' }
  }

  // Validate hiệu lực theo NGÀY (VN) để tránh lệch timezone khi so sánh timestamp.
  const nowVN = toVNDateOnly(now)
  const startVN = toVNDateOnly(voucher.startsAt)
  const expVN = toVNDateOnly(voucher.expiresAt)

  if (startVN) {
    if (nowVN < startVN) {
      const [y, m, d] = startVN.split('-')
      return {
        ok: false,
        message: `Mã giảm giá chưa có hiệu lực, áp dụng từ ngày ${d}/${m}/${y}`,
      }
    }
  }

  if (expVN) {
    if (nowVN > expVN) {
      return { ok: false, message: 'Mã giảm giá đã hết hạn' }
    }
  }


  const usageLimit = Number(voucher.usageLimit || 0)
  const usedCount  = Number(voucher.usedCount  || 0)
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { ok: false, message: 'Mã giảm giá đã hết lượt sử dụng' }
  }

  // MỚI: kiểm tra giới hạn theo user (perUserLimit=0 nghĩa là không giới hạn)
  const perUserLimit = Number(voucher.perUserLimit || 0)
  if (userId && perUserLimit > 0) {
    const usedByThisUser = (voucher.usedBy || []).filter(
      (u) => String(u.user) === String(userId)
    ).length
    if (usedByThisUser >= perUserLimit) {
      return { ok: false, message: 'Bạn đã sử dụng voucher này' }
    }
  }

  // MỚI: kiểm tra danh mục áp dụng (rỗng = áp dụng toàn shop)
  const applicableCategories = voucher.applicableCategories || []
  if (applicableCategories.length > 0 && categories.length > 0) {
    const matched = categories.some((c) => applicableCategories.includes(c))
    if (!matched) {
      return {
        ok: false,
        message: `Mã giảm giá chỉ áp dụng cho danh mục: ${applicableCategories.join(', ')}`,
      }
    }
  }

  const minOrder = Number(voucher.minOrder || 0)
  if (amount < minOrder) {
    return {
      ok: false,
      message: `Đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')}đ mới được dùng mã này`,
    }
  }

  let discountAmount = 0
  if (voucher.type === 'percent') {
    discountAmount = amount * (Number(voucher.value || 0) / 100)
    const maxDiscount = Number(voucher.maxDiscount || 0)
    if (maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscount)
    }
  } else if (voucher.type === 'fixed') {
    discountAmount = Number(voucher.value || 0)
  } else if (voucher.type === 'freeship') {
    // MỚI: freeship — value = mức giảm tối đa cho phí ship, 0 = miễn phí toàn bộ
    const cap = Number(voucher.value || 0)
    discountAmount = cap > 0 ? Math.min(cap, Number(shippingFee || 0)) : Number(shippingFee || 0)
  }


  discountAmount =
    voucher.type === 'freeship'
      ? Math.max(0, Math.min(discountAmount, Number(shippingFee || 0)))
      : Math.max(0, Math.min(discountAmount, amount))

  return { ok: true, discountAmount }
}

const applyVoucher = asyncHandler(async (req, res) => {
  const code        = normalizeCode(req.body?.code)
  const orderAmount = Number(req.body?.orderAmount)

  if (!code) {
    res.status(400)
    throw new Error('Vui lòng nhập mã giảm giá')
  }

  const voucher = await Voucher.findOne({ code })
  if (!voucher) {
    res.status(400)
    throw new Error('Mã giảm giá không tồn tại')
  }

  const result = applyVoucherLogic({ voucher, orderAmount })
  if (!result.ok) {
    res.status(400)
    throw new Error(result.message)
  }

  return res.json({
    code:           voucher.code,
    type:           voucher.type,
    discountAmount: result.discountAmount,
  })
})

// ── MỚI: GET /api/vouchers/available — danh sách voucher cho KHÁCH xem ở
// popup checkout (khác getVouchers vốn chỉ dành cho admin quản lý).
// Query optional: orderAmount, shippingFee, categories (comma-separated)
// để tính sẵn discountAmount/eligible cho từng voucher, tránh phải gọi
// validate riêng cho từng cái ở frontend.
const getAvailableVouchers = asyncHandler(async (req, res) => {
  const now = new Date()
  const orderAmount = Number(req.query.orderAmount || 0)
  const shippingFee = Number(req.query.shippingFee || 0)
  const categories = String(req.query.categories || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  const vouchers = await Voucher.find({
    isActive: true,
    expiresAt: { $gte: now },
  }).sort({ createdAt: -1 })

  const result = vouchers.map((voucher) => {
    const check = applyVoucherLogic({
      voucher,
      orderAmount: orderAmount || voucher.minOrder || 1, // để hiện được cả khi giỏ hàng rỗng
      userId: req.user?._id,
      shippingFee,
      categories,
    })

    return {
      _id: voucher._id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      value: voucher.value,
      minOrder: voucher.minOrder,
      maxDiscount: voucher.maxDiscount,
      expiresAt: voucher.expiresAt,
      startsAt: voucher.startsAt,
      usageLimit: voucher.usageLimit,
      usedCount: voucher.usedCount,
      applicableCategories: voucher.applicableCategories,
      eligible: orderAmount > 0 ? check.ok : null, // null = chưa biết (chưa có giỏ hàng thật)
      reason: orderAmount > 0 && !check.ok ? check.message : null,
      discountAmount: orderAmount > 0 && check.ok ? check.discountAmount : 0,
    }
  })

  res.json(result)
})

// ── MỚI: POST /api/vouchers/validate — dùng cho cả "nhập mã tay" lẫn
// tự động re-check khi giỏ hàng thay đổi. Khác /apply (cũ, public, không
// biết user) ở chỗ: có req.user để kiểm tra perUserLimit.
const validateVoucher = asyncHandler(async (req, res) => {
  const code = normalizeCode(req.body?.code)
  const orderAmount = Number(req.body?.orderAmount)
  const shippingFee = Number(req.body?.shippingFee || 0)
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : []

  if (!code) {
    res.status(400)
    throw new Error('Vui lòng nhập mã voucher')
  }

  const voucher = await Voucher.findOne({ code })
  if (!voucher) {
    res.status(400)
    throw new Error('Mã voucher không tồn tại')
  }

  const result = applyVoucherLogic({
    voucher,
    orderAmount,
    userId: req.user?._id,
    shippingFee,
    categories,
  })

  if (!result.ok) {
    res.status(400)
    throw new Error(result.message)
  }

  res.json({
    voucherId: voucher._id,
    code: voucher.code,
    name: voucher.name,
    type: voucher.type,
    value: voucher.value,
    discountAmount: result.discountAmount,
  })
})

// ── MỚI: POST /api/vouchers/calculate — tính lại toàn bộ breakdown thanh
// toán khi có/không có voucher, dùng để hiển thị "Tạm tính / Voucher /
// Phí vận chuyển / Tổng thanh toán" luôn khớp với backend (tránh sai số
// làm tròn hoặc frontend tự tính sai).
const calculateVoucher = asyncHandler(async (req, res) => {
  const code = req.body?.code ? normalizeCode(req.body.code) : ''
  const itemsPrice = Number(req.body?.itemsPrice || 0)
  const shippingFee = Number(req.body?.shippingFee || 0)
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : []

  let discountAmount = 0
  let voucherInfo = null

  if (code) {
    const voucher = await Voucher.findOne({ code })
    if (!voucher) {
      res.status(400)
      throw new Error('Mã voucher không tồn tại')
    }
    const result = applyVoucherLogic({
      voucher,
      orderAmount: itemsPrice,
      userId: req.user?._id,
      shippingFee,
      categories,
    })
    if (!result.ok) {
      res.status(400)
      throw new Error(result.message)
    }
    discountAmount = result.discountAmount
    voucherInfo = { voucherId: voucher._id, code: voucher.code, name: voucher.name, type: voucher.type }
  }

  // freeship giảm vào phí ship, percent/fixed giảm vào tạm tính
  const isFreeship = voucherInfo?.type === 'freeship'
  const itemsDiscount = isFreeship ? 0 : discountAmount
  const shippingDiscount = isFreeship ? discountAmount : 0

  res.json({
    voucher: voucherInfo,
    itemsPrice,
    shippingFee,
    discountAmount,
    itemsDiscount,
    shippingDiscount,
    finalShippingFee: Math.max(0, shippingFee - shippingDiscount),
    finalTotal: Math.max(0, itemsPrice - itemsDiscount + Math.max(0, shippingFee - shippingDiscount)),
  })
})

const getVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find({}).sort({ createdAt: -1 })
  res.json(vouchers)
})


const createVoucher = asyncHandler(async (req, res) => {
  const body = req.body || {}

  const code = normalizeCode(body.code)
  if (!code) {
    res.status(400)
    throw new Error('code bắt buộc')
  }

  const type = body.type
  if (!['percent', 'fixed', 'freeship'].includes(type)) {
    res.status(400)
    throw new Error('type phải là percent, fixed hoặc freeship')
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  if (!expiresAt || isNaN(expiresAt.getTime())) {
    res.status(400)
    throw new Error('expiresAt không hợp lệ')
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null

  const voucher = await Voucher.create({
    code,
    name: String(body.name || '').trim(),
    type,
    value:       Number(body.value       || 0),
    minOrder:    Number(body.minOrder    || 0),
    maxDiscount: Number(body.maxDiscount || 0),
    usageLimit:  Number(body.usageLimit  || 0),
    usedCount:   0,
    perUserLimit: body.perUserLimit !== undefined ? Number(body.perUserLimit) : 1,
    applicableCategories: Array.isArray(body.applicableCategories) ? body.applicableCategories : [],
    startsAt,
    expiresAt,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  })

  res.status(201).json(voucher)
})


const updateVoucher = asyncHandler(async (req, res) => {
  const { id }  = req.params
  const body    = req.body || {}
  const update  = {}

  if (body.code       !== undefined) update.code       = normalizeCode(body.code)
  if (body.name       !== undefined) update.name       = String(body.name).trim()
  if (body.type       !== undefined) update.type       = body.type
  if (body.value      !== undefined) update.value      = Number(body.value)
  if (body.minOrder   !== undefined) update.minOrder   = Number(body.minOrder)
  if (body.maxDiscount!== undefined) update.maxDiscount= Number(body.maxDiscount)
  if (body.usageLimit !== undefined) update.usageLimit = Number(body.usageLimit)
  if (body.usedCount  !== undefined) update.usedCount  = Number(body.usedCount)
  if (body.perUserLimit !== undefined) update.perUserLimit = Number(body.perUserLimit)
  if (body.applicableCategories !== undefined) {
    update.applicableCategories = Array.isArray(body.applicableCategories) ? body.applicableCategories : []
  }
  if (body.isActive   !== undefined) update.isActive   = Boolean(body.isActive)

  if (body.startsAt !== undefined) {
    update.startsAt = body.startsAt ? new Date(body.startsAt) : null
  }

  if (body.expiresAt !== undefined) {
    const d = body.expiresAt ? new Date(body.expiresAt) : null
    if (!d || isNaN(d.getTime())) {
      res.status(400)
      throw new Error('expiresAt không hợp lệ')
    }
    update.expiresAt = d
  }

  const voucher = await Voucher.findByIdAndUpdate(id, update, { new: true })
  if (!voucher) {
    res.status(404)
    throw new Error('Không tìm thấy voucher')
  }

  res.json(voucher)
})

const deleteVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params

  const voucher = await Voucher.findById(id)
  if (!voucher) {
    res.status(404)
    throw new Error('Không tìm thấy voucher')
  }

  await Voucher.findByIdAndDelete(id)
  res.json({ message: 'Đã xoá voucher', id })
})

export {
  applyVoucher,
  applyVoucherLogic,
  getVouchers,
  getAvailableVouchers,
  validateVoucher,
  calculateVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
}