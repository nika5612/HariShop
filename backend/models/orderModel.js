import mongoose from 'mongoose'

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    orderItems: [
      {
        name:    { type: String, required: true },
        qty:     { type: Number, required: true },
        image:   { type: String, required: true },
        price:   { type: Number, required: true },
        weight:  { type: Number, default: 0 },
        // ── MỚI: lưu màu sắc khách đã chọn ──────────────────────
        color:   { type: String, default: '' },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],

    shippingAddress: {
      fullName:      { type: String, required: true },
      phone:         { type: String, required: true },
      province:      { type: String, required: true },
      district:      { type: String, default: '' },
      ward:          { type: String, required: true },
      detail:        { type: String, required: true },
      ghnDistrictId: { type: Number, default: null },
      ghnWardCode:   { type: String, default: '' },
    },

    paymentMethod:  { type: String, required: true },
    paymentResult: {
      id:           { type: String },
      status:       { type: String },
      update_time:  { type: String },
      email_address:{ type: String },
    },

    taxPrice:      { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice:    { type: Number, required: true, default: 0.0 },

    isPaid:    { type: Boolean, required: true, default: false },
    paidAt:    { type: Date },

    deliveryMethod:  { type: String, default: 'nhanh' },
    voucherCode:     { type: String, default: '' },
    // MỚI: lưu đầy đủ thông tin voucher tại thời điểm đặt hàng (không chỉ
    // code+discountAmount như trước) — để lịch sử đơn hàng không đổi dù
    // sau này voucher gốc bị admin sửa/xoá.
    voucherId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    voucherName:     { type: String, default: '' },
    discountType:    { type: String, default: '' }, // 'percent' | 'fixed' | 'freeship'
    discountValue:   { type: Number, default: 0 },   // giá trị gốc của voucher (vd: 10 nếu percent 10%)
    shopMessage:     { type: String, default: '' },
    deliveryFee:     { type: Number, default: 0.0 },
    voucherDiscount: { type: Number, default: 0.0 },
    totalWeight:     { type: Number, default: 0.0 },
    itemsPrice:      { type: Number, required: true, default: 0.0 },

    isDelivered:  { type: Boolean, required: true, default: false },
    deliveredAt:  { type: Date },

    isCancelled:  { type: Boolean, default: false },
    cancelledAt:  { type: Date },
    cancelReason: { type: String, default: '' },
    // MỚI: chống hoàn kho 2 lần cho cùng 1 đơn (có nhiều đường dẫn tới
    // trạng thái 'cancelled'/'returned': approveCancelOrder VÀ
    // updateOrderStatus — nếu không có cờ này, cả 2 cùng chạy trên
    // 1 đơn sẽ cộng dư tồn kho ảo).
    stockRestored: { type: Boolean, default: false },
    // MỚI: chống hoàn usedCount/usedBy của voucher 2 lần — cùng lý do
    // với stockRestored ở trên (đơn có thể bị hủy qua nhiều đường dẫn).
    voucherReverted: { type: Boolean, default: false },
    cancelRequest: {
      requested:   { type: Boolean, default: false },
      reason:      { type: String, default: '' },
      requestedAt: { type: Date },
    },

    shippingProvider:       { type: String, default: '' },
    shippingServiceCode:    { type: String, default: '' },
    shippingServiceName:    { type: String, default: '' },
    shippingEtaDate:        { type: Date },
    shippingTrackingId:     { type: String, default: '' },
    shippingTrackingEvents: [
      {
        status:      { type: String, default: '' },
        description: { type: String, default: '' },
        location:    { type: String, default: '' },
        time:        { type: Date },
      },
    ],

    ghnOrderCode:   { type: String, default: '' },
    ghnSortCode:    { type: String, default: '' },
    ghnTrackingUrl: { type: String, default: '' },

    // MỚI: mã vận đơn GHTK (gọi là "label") sau khi tạo đơn thật thành công
    ghtkLabelCode:  { type: String, default: '' },
    ghtkPartnerId:  { type: String, default: '' }, // mã đơn nội bộ gửi cho GHTK (HS-<orderId>)

    transferContent: { type: String, default: '' },

    // ── MỚI (A3): trạng thái đơn hàng chi tiết theo timeline ────────
    status: {
      type: String,
      enum: [
        'pending',           // 1. Đơn hàng đã được đặt thành công
        'confirmed',         // 2. Shop đã xác nhận và chuẩn bị hàng
        'packing',           // 3. Đang đóng gói hàng hóa
        'waiting_pickup',    // 4. Chờ đơn vị vận chuyển lấy hàng
        'picked_up',         // 5. GHN đã lấy hàng thành công
        'in_transit',        // 6. Đang vận chuyển đến kho trung gian
        'out_for_delivery',  // 7. Shipper đang giao hàng đến bạn
        'delivered',         // 8. Giao hàng thành công
        'delivery_failed',   // 9. Giao hàng không thành công
        'returning',         // 10. Hàng đang hoàn về kho
        'returned',          // 11. Hàng đã hoàn về kho
        'cancelled',         // 12. Đơn hàng đã bị hủy
      ],
      default: 'pending',
    },
    statusHistory: [
      {
        status:    { type: String, required: true },
        note:      { type: String, default: '' },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ── MỚI (A5): Hoàn tiền khi giao hàng thất bại ──────────────────
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'completed', 'rejected'],
      default: 'none',
    },
    refundAmount:      { type: Number, default: 0 },
    refundAt:          { type: Date },
    refundNote:        { type: String, default: '' },      // ghi chú của Admin khi xử lý
    refundRequestedAt: { type: Date },
    refundReason:      { type: String, default: '' },      // lý do khách nêu khi yêu cầu
    refundBankInfo: {
      bankName:      { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
  },
  { timestamps: true }
)

const Order = mongoose.model('Order', orderSchema)

export default Order