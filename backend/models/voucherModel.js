import mongoose from 'mongoose'

const voucherSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    type: {
      type: String,
      required: true,
      enum: ['percent', 'fixed'],
    },

    value: {
      type: Number,
      required: true,
      default: 0,
    },

    minOrder: {
      type: Number,
      required: true,
      default: 0,
    },

    // Chỉ áp dụng cho percent
    maxDiscount: {
      type: Number,
      default: 0,
    },

    // 0 = không giới hạn
    usageLimit: {
      type: Number,
      required: true,
      default: 0,
    },

    usedCount: {
      type: Number,
      required: true,
      default: 0,
    },

    // Ngày bắt đầu hiệu lực (optional — null = hiệu lực ngay)
    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
)

const Voucher = mongoose.model('Voucher', voucherSchema)

export default Voucher