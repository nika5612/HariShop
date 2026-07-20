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

    // MỚI: tên hiển thị cho khách (VD: "Giảm 50K cho đơn từ 500K") —
    // trước đây chỉ có code, khách nhìn mã không biết voucher gì.
    name: {
      type: String,
      default: '',
    },

    type: {
      type: String,
      required: true,
      enum: ['percent', 'fixed', 'freeship'], // MỚI: thêm loại freeship
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

    // 0 = không giới hạn (tổng toàn hệ thống)
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

    // MỚI: giới hạn lượt dùng CHO MỖI USER — 0 = không giới hạn,
    // mặc định 1 = mỗi người chỉ được dùng 1 lần (giống Shopee).
    perUserLimit: {
      type: Number,
      required: true,
      default: 1,
    },

    // MỚI: danh sách user đã dùng voucher này — dùng để tính perUserLimit
    // và trả lỗi "Bạn đã sử dụng voucher này".
    usedBy: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
      },
    ],

    // MỚI: danh mục sản phẩm được áp dụng — rỗng = áp dụng toàn shop.
    applicableCategories: {
      type: [String],
      default: [],
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