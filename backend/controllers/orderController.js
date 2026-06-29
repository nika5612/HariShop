import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Order from '../models/orderModel.js'
import Settings from '../models/settingsModel.js'

// ─── GHN Helper ───────────────────────────────────────────────────────────────
const USE_SANDBOX = (process.env.GHN_USE_SANDBOX || '').trim() === 'true'
const GHN_BASE_URL = USE_SANDBOX
  ? 'https://dev-online-gateway.ghn.vn/shiip/public-api'
  : 'https://online-gateway.ghn.vn/shiip/public-api'

function ghnCredentials() {
  const trim = (keys) => {
    for (const k of keys) {
      const v = (process.env[k] || '').trim()
      if (v) return v
    }
    return ''
  }
  const token = USE_SANDBOX
    ? trim(['GHN_TOKEN_DEV'])
    : trim(['GHN_TOKEN', 'TOKEN_GHN'])
  const shopId = USE_SANDBOX
    ? trim(['GHN_SHOP_ID_DEV'])
    : trim(['GHN_SHOP_ID', 'ID_GHN'])
  return { token, shopId }
}

async function ghnFetchJson(path, { token, shopId, method = 'POST', body } = {}) {
  const headers = { 'Content-Type': 'application/json', Token: token }
  if (shopId) headers.ShopId = String(shopId)
  const res = await fetch(`${GHN_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || (data?.code && Number(data.code) !== 200)) {
    throw new Error(data?.message || `GHN error (${res.status})`)
  }
  return data
}

async function createGHNOrder(order, warehouseAddress) {
  const { token, shopId } = ghnCredentials()
  if (!token || !shopId) {
    console.warn('⚠️ GHN credentials missing — bỏ qua tạo vận đơn')
    return null
  }

  const addr = order.shippingAddress
  const toDistrictId = Number(addr.ghnDistrictId || 0)
  const toWardCode = String(addr.ghnWardCode || '').trim()

  if (!toDistrictId || !toWardCode) {
    console.warn('⚠️ Thiếu ghnDistrictId/ghnWardCode — bỏ qua tạo vận đơn GHN')
    return null
  }

  const fromDistrictId = Number(warehouseAddress?.ghnDistrictId || 0)
  const fromWardCode = String(warehouseAddress?.ghnWardCode || '').trim()

  const totalWeight = Math.max(1, Number(order.totalWeight || 0))
  const rawCodAmount = order.paymentMethod === 'cod' ? Number(order.totalPrice || 0) : 0
  const codAmount = Math.min(rawCodAmount, 300000)

  const payload = {
    payment_type_id: order.paymentMethod === 'cod' ? 2 : 1,
    note: order.shopMessage || '',
    required_note: 'KHONGCHOXEMHANG',
    to_name: addr.fullName || '',
    to_phone: addr.phone || '',
    to_address: addr.detail || '',
    to_ward_code: toWardCode,
    to_district_id: toDistrictId,
    cod_amount: codAmount,
    weight: totalWeight,
    length: 20,
    width: 20,
    height: 10,
    insurance_value: Math.min(Number(order.itemsPrice || 0), 5000000),
    service_type_id: 2,
    items: order.orderItems.map((item) => ({
      name: String(item.name || 'Sản phẩm'),
      code: String(item.product || ''),
      quantity: Number(item.qty || 1),
      price: Number(item.price || 0),
      weight: Number(item.weight || 200),
      length: 10,
      width: 10,
      height: 10,
    })),
  }

  if (fromDistrictId) payload.from_district_id = fromDistrictId
  if (fromWardCode) payload.from_ward_code = fromWardCode

  try {
    const res = await ghnFetchJson('/v2/shipping-order/create', { token, shopId, body: payload })
    console.log('✅ GHN order created:', res?.data?.order_code)
    return res?.data || null
  } catch (e) {
    console.error('❌ GHN create order failed:', e.message)
    return null
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── MỚI: Trừ tồn kho theo màu sau khi đặt hàng thành công ────────────────────
async function deductStockByColor(orderItems) {
  const Product = (await import('../models/productModel.js')).default

  for (const item of orderItems) {
    try {
      const product = await Product.findById(item.product)
      if (!product) continue

      if (product.colors && product.colors.length > 0 && item.color) {
        // Tìm đúng màu và trừ stock
        const colorIndex = product.colors.findIndex(
          (c) => c.name === item.color
        )
        if (colorIndex !== -1) {
          product.colors[colorIndex].countInStock = Math.max(
            0,
            product.colors[colorIndex].countInStock - item.qty
          )
          // pre('save') sẽ tự tính lại countInStock tổng
          await product.save()
          console.log(
            `✅ Trừ stock: ${product.name} [${item.color}] -${item.qty} → còn ${product.colors[colorIndex].countInStock}`
          )
        }
      } else {
        // Sản phẩm không có colors → trừ countInStock tổng
        product.countInStock = Math.max(0, product.countInStock - item.qty)
        await product.save()
      }
    } catch (e) {
      console.error(`❌ Lỗi trừ stock sản phẩm ${item.product}:`, e.message)
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  console.log('=== BACKEND RECEIVED ===', JSON.stringify(req.body, null, 2))
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    deliveryMethod,
    shippingProvider,
    shippingServiceCode,
    shippingServiceName,
    shippingEtaDate,
    voucherCode,
    shopMessage,
    totalWeight: frontendTotalWeight,
    itemsPrice,
    deliveryFee,
    voucherDiscount,
    taxPrice,
    shippingPrice,
    totalPrice,
    transferContent,
  } = req.body

  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400); throw new Error('No order items')
  }
  if (!shippingAddress) {
    res.status(400); throw new Error('Shipping address required')
  }

  const addr = shippingAddress
  if (!addr.fullName?.trim()) { res.status(400); throw new Error('Full name required') }
  if (!addr.phone?.trim())    { res.status(400); throw new Error('Phone number required') }
  if (!addr.province?.trim()) { res.status(400); throw new Error('Province required') }
  if (!addr.ward?.trim())     { res.status(400); throw new Error('Ward required') }
  if (!addr.detail?.trim())   { res.status(400); throw new Error('Address detail required') }
  if (!paymentMethod?.trim()) { res.status(400); throw new Error('Payment method required') }
  if (isNaN(itemsPrice) || itemsPrice < 0) { res.status(400); throw new Error('Invalid items price') }
  if (isNaN(totalPrice) || totalPrice <= 0) { res.status(400); throw new Error('Invalid total price') }

  let computedTotalWeight = 0
  if (Array.isArray(orderItems)) {
    computedTotalWeight = orderItems.reduce(
      (sum, item) => sum + (item.weight || 0) * (item.qty || 0), 0
    )
  }
  const totalWeight = frontendTotalWeight > 0
    ? Number(frontendTotalWeight)
    : computedTotalWeight

  const order = new Order({
    // ── MỚI: lưu color trong từng orderItem ──────────────────────
    orderItems: orderItems.map((item) => ({
      name:    item.name,
      qty:     item.qty,
      image:   item.image,
      price:   item.price,
      weight:  item.weight || 0,
      color:   item.color || '',   // ← lưu màu vào DB
      product: item.product,
    })),
    user: req.user._id,
    shippingAddress,
    paymentMethod,
    deliveryMethod:      deliveryMethod || 'nhanh',
    shippingProvider:    shippingProvider || '',
    shippingServiceCode: shippingServiceCode || '',
    shippingServiceName: shippingServiceName || '',
    shippingEtaDate:     shippingEtaDate ? new Date(shippingEtaDate) : undefined,
    voucherCode:         voucherCode || '',
    shopMessage:         shopMessage || '',
    totalWeight,
    itemsPrice,
    deliveryFee:         deliveryFee || 0,
    voucherDiscount:     voucherDiscount || 0,
    taxPrice:            taxPrice || 0,
    shippingPrice:       shippingPrice || 0,
    totalPrice,
    transferContent:     transferContent || '',
  })

  const createdOrder = await order.save()

  // ── MỚI: Trừ tồn kho theo màu ngay sau khi lưu đơn ─────────────
  try {
    await deductStockByColor(createdOrder.orderItems)
  } catch (e) {
    console.error('❌ deductStockByColor error (non-fatal):', e.message)
  }

  // ── Tạo vận đơn GHN ─────────────────────────────────────────────
  if (shippingProvider === 'ghn' || USE_SANDBOX) {
    try {
      const settings = await Settings.findOne({ key: 'global' }).lean().catch(() => null)
      const warehouseAddress = settings?.warehouseAddress || null

      const ghnData = await createGHNOrder(createdOrder, warehouseAddress)
      if (ghnData?.order_code) {
        createdOrder.ghnOrderCode   = ghnData.order_code
        createdOrder.ghnSortCode    = ghnData.sort_code || ''
        createdOrder.ghnTrackingUrl = `https://tracking.ghn.dev/?order_code=${ghnData.order_code}`
        await createdOrder.save()
        console.log('✅ Lưu ghnOrderCode vào order:', ghnData.order_code)
      }
    } catch (e) {
      console.error('❌ Lỗi tạo vận đơn GHN (non-fatal):', e.message)
    }
  }

  res.status(201).json(createdOrder)
})

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email')
  if (order) {
    res.json(order)
  } else {
    res.status(404); throw new Error('Order not found')
  }
})

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (order) {
    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id:            req.body.id,
      status:        req.body.status,
      update_time:   req.body.update_time,
      email_address: req.body.payer.email_address,
    }
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } else {
    res.status(404); throw new Error('Order not found')
  }
})

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (order) {
    order.isDelivered = true
    order.deliveredAt = Date.now()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } else {
    res.status(404); throw new Error('Order not found')
  }
})

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    res.status(400); throw new Error('Invalid user ID')
  }
  const orders = await Order.find({ user: req.user._id })
  res.json(orders)
})

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id name')
  res.json(orders)
})

// @desc    Track GHN shipment for an order
// @route   GET /api/orders/:id/track
// @access  Private
const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401); throw new Error('Không có quyền xem đơn hàng này')
  }

  const orderCode = order.ghnOrderCode
  if (!orderCode) {
    return res.json({
      available: false,
      reason: 'Đơn hàng chưa có mã vận đơn GHN',
      order: {
        _id: order._id,
        status: order.isCancelled ? 'cancelled'
          : order.isDelivered ? 'delivered'
          : order.isPaid ? 'paid'
          : 'pending',
      },
    })
  }

  try {
    const { token } = ghnCredentials()
    const data = await ghnFetchJson('/v2/shipping-order/detail', {
      token, method: 'POST', body: { order_code: orderCode },
    })
    const ghnOrder = Array.isArray(data?.data) ? data.data[0] : data?.data
    const log = Array.isArray(ghnOrder?.log) ? ghnOrder.log : []
    const events = log.map((l) => ({
      status:      l?.status || '',
      description: l?.status || '',
      location:    '',
      time:        l?.updated_date ? new Date(l.updated_date).toISOString() : null,
    }))
    res.json({
      available: true,
      orderCode,
      trackingUrl: order.ghnTrackingUrl || `https://tracking.ghn.dev/?order_code=${orderCode}`,
      currentStatus: ghnOrder?.status || '',
      events,
      estimatedDelivery: order.shippingEtaDate || null,
    })
  } catch (e) {
    console.error('❌ GHN track error:', e.message)
    res.status(500); throw new Error(`Không thể theo dõi đơn hàng: ${e.message}`)
  }
})

// @desc    Customer requests order cancellation
// @route   PUT /api/orders/:id/cancel-request
// @access  Private
const cancelOrderRequest = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  if (order.user.toString() !== req.user._id.toString()) { res.status(401); throw new Error('Không có quyền') }
  if (order.isPaid)      { res.status(400); throw new Error('Đơn hàng đã thanh toán, không thể hủy') }
  if (order.isDelivered) { res.status(400); throw new Error('Đơn hàng đã giao, không thể hủy') }
  if (order.isCancelled) { res.status(400); throw new Error('Đơn hàng đã bị hủy') }

  order.cancelRequest = {
    requested: true,
    reason: req.body.reason || '',
    requestedAt: Date.now(),
  }
  const updatedOrder = await order.save()
  res.json(updatedOrder)
})

// @desc    Admin approves order cancellation → hoàn lại tồn kho theo màu
// @route   PUT /api/orders/:id/approve-cancel
// @access  Private/Admin
const approveCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }

  if (order.ghnOrderCode) {
    try {
      const { token, shopId } = ghnCredentials()
      await ghnFetchJson('/v2/switch-status/cancel', {
        token, shopId, body: { order_codes: [order.ghnOrderCode] },
      })
      console.log('✅ Đã hủy vận đơn GHN:', order.ghnOrderCode)
    } catch (e) {
      console.warn('⚠️ Không thể hủy vận đơn GHN (non-fatal):', e.message)
    }
  }

  // ── MỚI: Hoàn lại tồn kho theo màu khi Admin chấp thuận hủy ────
  try {
    const Product = (await import('../models/productModel.js')).default
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product)
      if (!product) continue

      if (product.colors && product.colors.length > 0 && item.color) {
        const colorIndex = product.colors.findIndex((c) => c.name === item.color)
        if (colorIndex !== -1) {
          product.colors[colorIndex].countInStock += item.qty
          await product.save()
          console.log(`✅ Hoàn stock: ${product.name} [${item.color}] +${item.qty}`)
        }
      } else {
        product.countInStock += item.qty
        await product.save()
      }
    }
  } catch (e) {
    console.error('❌ Lỗi hoàn stock (non-fatal):', e.message)
  }

  order.isCancelled  = true
  order.cancelledAt  = Date.now()
  order.cancelReason = order.cancelRequest?.reason || ''
  order.cancelRequest = { requested: false, reason: '', requestedAt: null }

  const updatedOrder = await order.save()
  res.json(updatedOrder)
})

// @desc    Admin rejects order cancellation request
// @route   PUT /api/orders/:id/reject-cancel
// @access  Private/Admin
const rejectCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  order.cancelRequest = { requested: false, reason: '', requestedAt: null }
  const updatedOrder = await order.save()
  res.json(updatedOrder)
})

// @desc    SePay webhook
// @route   POST /api/orders/sepay-webhook
// @access  Public
const sepayWebhook = async (req, res) => {
  try {
    const data = req.body
    console.log('[SePay Webhook] Nhận dữ liệu:', JSON.stringify(data, null, 2))

    const content = (data.content || '').toUpperCase()
    const match = content.match(/TT\d{6}/)
    if (!match) {
      return res.status(200).json({ success: false, message: 'Không khớp mã đơn hàng' })
    }

    const transferCode = match[0]
    const order = await Order.findOne({ transferContent: transferCode })

    if (!order) {
      return res.status(200).json({ success: false, message: 'Không tìm thấy đơn hàng' })
    }
    if (order.isPaid) {
      return res.status(200).json({ success: true, message: 'Đơn hàng đã thanh toán trước đó' })
    }

    order.isPaid = true
    order.paidAt = new Date()
    order.paymentResult = {
      id:            data.id || data.referenceCode || transferCode,
      status:        'COMPLETED',
      update_time:   new Date().toISOString(),
      email_address: '',
    }

    await order.save()
    console.log('[SePay Webhook] ✅ Đã cập nhật isPaid cho order:', order._id)
    return res.status(200).json({ success: true, message: 'Cập nhật thanh toán thành công' })
  } catch (error) {
    console.error('[SePay Webhook] Lỗi:', error)
    return res.status(200).json({ success: false, message: 'Lỗi server' })
  }
}

// Admin: revenue summary
const getAdminRevenueSummary = asyncHandler(async (req, res) => {
  const months = Number(req.query.months || 1)
  const safeMonths = !isNaN(months) && months > 0 ? months : 1
  const now = new Date()
  const fromDate = new Date(now)
  fromDate.setMonth(fromDate.getMonth() - safeMonths)

  const [agg] = await Order.aggregate([
    { $match: { isPaid: true, paidAt: { $gte: fromDate } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, paidCount: { $sum: 1 } } },
  ])

  res.json({
    months: safeMonths,
    fromDate: fromDate.toISOString(),
    totalRevenue: agg?.totalRevenue || 0,
    paidCount: agg?.paidCount || 0,
  })
})

const normalizeBrand = (brand) => {
  if (!brand) return ''
  return String(brand).trim().toLowerCase()
}

const getAdminBrandBreakdown = asyncHandler(async (req, res) => {
  const months = Number(req.query.months || 1)
  const safeMonths = !isNaN(months) && months > 0 ? months : 1
  const now = new Date()
  const fromDate = new Date(now)
  fromDate.setMonth(fromDate.getMonth() - safeMonths)

  const topBrands = ['apple', 'samsung', 'xiaomi', 'oppo', 'realme']
  const buckets = { apple: 0, samsung: 0, xiaomi: 0, oppo: 0, realme: 0, khác: 0 }

  const orders = await Order.find({
    isPaid: true, paidAt: { $gte: fromDate },
  }).select('orderItems')

  const productIds = []
  for (const o of orders) {
    for (const it of o.orderItems || []) {
      if (it.product) productIds.push(it.product)
    }
  }

  const uniqueProductIds = [...new Set(productIds.map((id) => String(id)))]
  const products = uniqueProductIds.length
    ? await (await import('../models/productModel.js')).default
        .find({ _id: { $in: uniqueProductIds } })
        .select('_id brand')
        .lean()
    : []

  const productBrandMap = new Map(
    (products || []).map((p) => [String(p._id), normalizeBrand(p.brand)])
  )

  let totalRevenue = 0
  for (const o of orders) {
    for (const it of o.orderItems || []) {
      const pid = it.product ? String(it.product) : ''
      const brand = productBrandMap.get(pid) || ''
      const itemRevenue = (Number(it.price) || 0) * (Number(it.qty) || 0)
      totalRevenue += itemRevenue
      if (topBrands.includes(brand)) {
        buckets[brand] += itemRevenue
      } else {
        buckets['khác'] += itemRevenue
      }
    }
  }

  const labels = [...topBrands, 'khác']
  const values = labels.map((b) => buckets[b] || 0)
  const total = totalRevenue || 0
  const percentages = total ? values.map((v) => (v / total) * 100) : values.map(() => 0)

  res.json({ months: safeMonths, fromDate: fromDate.toISOString(), labels, values, percentages, totalRevenue: total })
})

// @desc    Admin delete order
// @route   DELETE /api/orders/admin/:id
// @access  Private/Admin
const deleteOrderByAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Order not found') }
  if (order.isPaid) { res.status(400); throw new Error('Không thể xóa đơn đã thanh toán') }

  if (order.ghnOrderCode) {
    try {
      const { token, shopId } = ghnCredentials()
      await ghnFetchJson('/v2/switch-status/cancel', {
        token, shopId, body: { order_codes: [order.ghnOrderCode] },
      })
    } catch (e) {
      console.warn('⚠️ Không thể hủy vận đơn GHN khi xóa order (non-fatal):', e?.message)
    }
  }

  await Order.findByIdAndDelete(req.params.id)
  res.json({ message: 'Order deleted', orderId: req.params.id })
})

export {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  trackOrder,
  cancelOrderRequest,
  approveCancelOrder,
  rejectCancelOrder,
  sepayWebhook,
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  deleteOrderByAdmin,
}