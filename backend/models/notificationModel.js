import mongoose from 'mongoose'

// Thông báo cho Admin — đơn giản hoá cho quy mô 1 shop (không tách theo từng
// tài khoản admin cụ thể). Nếu sau này có nhiều admin, có thể thêm field
// `recipient` để lọc theo từng người.
const notificationSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        // ── Thông báo cho Admin ──
        'new_order',        // Đơn đặt hàng mới
        'order_delivered',  // Đơn hàng giao thành công
        'cancel_request',   // Yêu cầu huỷ đơn
        'refund_request',   // Yêu cầu hoàn tiền
        // ── Thông báo cho Khách hàng ──
        'order_placed',     // Đặt hàng thành công
        'order_status',     // Cập nhật trạng thái đơn hàng (12 bước)
        'refund_completed', // Đã hoàn tiền
        'cancel_approved',  // Đơn hàng đã được huỷ (duyệt bởi Admin)
      ],
      required: true,
    },
    title:   { type: String, required: true },
    message: { type: String, default: '' },
    link:    { type: String, default: '' },   // FE điều hướng khi click, VD /order/<id>
    order:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    isRead:  { type: Boolean, default: false },

    // ── MỚI: null = thông báo cho Admin, có giá trị = thông báo riêng cho khách đó ──
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

notificationSchema.index({ createdAt: -1 })
notificationSchema.index({ isRead: 1 })
notificationSchema.index({ user: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification