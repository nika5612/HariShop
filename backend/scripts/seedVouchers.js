import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Voucher from '../models/voucherModel.js'

dotenv.config()

// ── Helper: ngày giờ VN (UTC+7) → UTC để lưu MongoDB ────────────────────────
// Ví dụ: vnDT(2026, 6, 6, 0, 0, 0) → 2026-06-05T17:00:00.000Z
// month: tháng thực (1–12)
const vnDT = (year, month, day, hour = 0, minute = 0, second = 0) =>
  new Date(Date.UTC(year, month - 1, day, hour, minute, second) - 7 * 60 * 60 * 1000)

const vouchers = [
  // ─────────────────────────────────────────────────────────────────
  // NINGYAO66 — Giảm 10%, CHỈ áp dụng đúng ngày 6/6/2026 (giờ VN)
  // ─────────────────────────────────────────────────────────────────
  {
    code:        'NINGYAO66',
    type:        'percent',
    value:       10,           // 10%
    minOrder:    0,
    maxDiscount: 2000000,            // không giới hạn số tiền giảm tối đa
    usageLimit:  0,            // không giới hạn lượt dùng
    usedCount:   0,
    startsAt:    vnDT(2026, 6, 6,  0,  0,  0),   // 00:00:00 ngày 6/6/2026 VN
    expiresAt:   vnDT(2026, 6, 6, 23, 59, 59),   // 23:59:59 ngày 6/6/2026 VN
    isActive:    true,
  },

  // ─────────────────────────────────────────────────────────────────
  // NINGYAO77 — Giảm 10%, CHỈ áp dụng đúng ngày 7/7/2026 (giờ VN)
  // ─────────────────────────────────────────────────────────────────
  {
    code:        'NINGYAO77',
    type:        'percent',
    value:       10,           // 10%
    minOrder:    0,
    maxDiscount: 2000000,
    usageLimit:  0,
    usedCount:   0,
    startsAt:    vnDT(2026, 7, 7,  0,  0,  0),   // 00:00:00 ngày 7/7/2026 VN
    expiresAt:   vnDT(2026, 7, 7, 23, 59, 59),   // 23:59:59 ngày 7/7/2026 VN
    isActive:    true,
  },

  // ─────────────────────────────────────────────────────────────────
  // NINGYAOTEST — Giảm 500.000đ, đơn tối thiểu 30.000.000đ
  //               Hiệu lực: 15/6/2026 → 30/7/2026 (giờ VN)
  // ─────────────────────────────────────────────────────────────────
  {
    code:        'NINGYAOTEST',
    type:        'fixed',
    value:       500000,       // giảm cố định 500.000đ
    minOrder:    30000000,     // đơn tối thiểu 30.000.000đ
    maxDiscount: 0,            // không dùng cho fixed
    usageLimit:  20,
    usedCount:   0,
    startsAt:    vnDT(2026, 6, 15,  0,  0,  0),  // 00:00:00 ngày 15/6/2026 VN
    expiresAt:   vnDT(2026, 7, 30, 23, 59, 59),  // 23:59:59 ngày 30/7/2026 VN
    isActive:    true,
  },

  // ─────────────────────────────────────────────────────────────────
  // NINGYAOTEST5 — Giảm 5% tổng đơn hàng
  //                Hiệu lực: 15/6/2026 → 30/7/2026 (giờ VN)
  // ─────────────────────────────────────────────────────────────────
  {
    code:        'NINGYAOTEST5',
    type:        'percent',
    value:       5,            // 5%
    minOrder:    0,
    maxDiscount: 2000000,
    usageLimit:  20,
    usedCount:   0,
    startsAt:    vnDT(2026, 6, 15,  0,  0,  0),  // 00:00:00 ngày 15/6/2026 VN
    expiresAt:   vnDT(2026, 7, 30, 23, 59, 59),  // 23:59:59 ngày 30/7/2026 VN
    isActive:    true,
  },
]

// ── Hiển thị giờ VN để verify ────────────────────────────────────────────────
const toVN = (d) => {
  if (!d) return 'N/A'
  return new Date(d.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19) + ' (VN)'
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hari-shop'
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB\n')

  for (const v of vouchers) {
    const exists = await Voucher.findOne({ code: v.code })
    if (exists) {
      await Voucher.updateOne({ code: v.code }, { $set: v })
      console.log(`Updated : ${v.code}`)
    } else {
      await Voucher.create(v)
      console.log(`Created : ${v.code}`)
    }
  }

  console.log('\n── Verify (hiển thị theo giờ VN) ──────────────────────')
  const all = await Voucher.find({ code: { $in: vouchers.map((v) => v.code) } }).sort({ code: 1 })
  for (const x of all) {
    console.log({
      code:      x.code,
      type:      x.type,
      value:     x.type === 'fixed' ? `${x.value.toLocaleString('vi-VN')}đ` : `${x.value}%`,
      minOrder:  x.minOrder ? `${x.minOrder.toLocaleString('vi-VN')}đ` : 'Không giới hạn',
      startsAt:  toVN(x.startsAt),
      expiresAt: toVN(x.expiresAt),
      isActive:  x.isActive,
    })
  }

  await mongoose.disconnect()
  console.log('\nSeed done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})