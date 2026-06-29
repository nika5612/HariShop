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

const applyVoucherLogic = ({ voucher, orderAmount }) => {
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
  }


  discountAmount = Math.max(0, Math.min(discountAmount, amount))

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
  if (!['percent', 'fixed'].includes(type)) {
    res.status(400)
    throw new Error('type phải là percent hoặc fixed')
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  if (!expiresAt || isNaN(expiresAt.getTime())) {
    res.status(400)
    throw new Error('expiresAt không hợp lệ')
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null

  const voucher = await Voucher.create({
    code,
    type,
    value:       Number(body.value       || 0),
    minOrder:    Number(body.minOrder    || 0),
    maxDiscount: Number(body.maxDiscount || 0),
    usageLimit:  Number(body.usageLimit  || 0),
    usedCount:   0,
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
  if (body.type       !== undefined) update.type       = body.type
  if (body.value      !== undefined) update.value      = Number(body.value)
  if (body.minOrder   !== undefined) update.minOrder   = Number(body.minOrder)
  if (body.maxDiscount!== undefined) update.maxDiscount= Number(body.maxDiscount)
  if (body.usageLimit !== undefined) update.usageLimit = Number(body.usageLimit)
  if (body.usedCount  !== undefined) update.usedCount  = Number(body.usedCount)
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

export { applyVoucher, getVouchers, createVoucher, updateVoucher, deleteVoucher }
