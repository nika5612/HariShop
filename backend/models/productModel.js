import mongoose from 'mongoose'

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { timestamps: true }
)

// ── MỚI: Schema cho từng biến thể màu ──────────────────────────
const colorSchema = mongoose.Schema({
  name:         { type: String, required: true },   // "Đen", "Trắng"...
  hexCode:      { type: String, default: '#888888' }, // mã màu hiển thị
  countInStock: { type: Number, required: true, default: 0 },
})

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name:        { type: String, required: true },
    image:       { type: String, required: true },
    brand:       { type: String, required: true },
    category:    { type: String, required: true },
    description: { type: String, required: true },
    reviews:     [reviewSchema],
    rating:      { type: Number, required: true, default: 0 },
    numReviews:  { type: Number, required: true, default: 0 },
    price:       { type: Number, required: true, default: 0 },

    // countInStock = tổng tất cả màu, tự động tính khi save
    countInStock: { type: Number, required: true, default: 0 },

    // ── MỚI: mảng màu sắc ──────────────────────────────────────
    colors: [colorSchema],

    weight: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// ── Tự động tính tổng countInStock từ colors trước khi save ────
productSchema.pre('save', function (next) {
  if (this.colors && this.colors.length > 0) {
    this.countInStock = this.colors.reduce(
      (sum, c) => sum + (Number(c.countInStock) || 0),
      0
    )
  }
  next()
})

productSchema.index({ rating: -1 })
productSchema.index({ createdAt: -1 })
productSchema.index({ price: 1 })
productSchema.index({ price: -1 })
productSchema.index({ name: 'text' })

const Product = mongoose.model('Product', productSchema)

export default Product