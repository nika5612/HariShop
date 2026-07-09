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

// ── MỚI: Schema thông số kỹ thuật (specs) ──────────────────────
// Tất cả các trường đều không bắt buộc - Admin có thể bỏ trống
const specsSchema = mongoose.Schema(
  {
    ram:          { type: String, default: '' },        // "12GB"
    storage:      { type: String, default: '' },        // "1TB"
    battery:      { type: Number, default: 0 },          // 4685 (mAh) - Number để AI sort/so sánh
    screenSize:   { type: String, default: '' },        // "6.9 inch"
    screenType:   { type: String, default: '' },        // "OLED 120Hz"
    camera:       { type: String, default: '' },        // "48MP + 12MP"
    chip:         { type: String, default: '' },        // "A19 Pro"
    os:           { type: String, default: '' },        // "iOS 19"
    sim:          { type: String, default: '' },        // "1 SIM + eSIM"
    connectivity: { type: String, default: '' },        // "5G, WiFi 7"
  },
  { _id: false }
)

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

    // ── MỚI: thông số kỹ thuật ──────────────────────────────────
    specs: { type: specsSchema, default: () => ({}) },

    weight: { type: Number, default: 0 },
  },
  { timestamps: true }
)

productSchema.pre('save', function () {
  if (this.colors && this.colors.length > 0) {
    this.countInStock = this.colors.reduce(
      (sum, c) => sum + (Number(c.countInStock) || 0),
      0
    )
  }
})

productSchema.index({ rating: -1 })
productSchema.index({ createdAt: -1 })
productSchema.index({ price: 1 })
productSchema.index({ price: -1 })
productSchema.index({ name: 'text' })

const Product = mongoose.model('Product', productSchema)

export default Product