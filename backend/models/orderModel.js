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

    transferContent: { type: String, default: '' },
  },
  { timestamps: true }
)

const Order = mongoose.model('Order', orderSchema)

export default Order