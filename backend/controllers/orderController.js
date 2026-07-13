import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import Settings from '../models/settingsModel.js'
import Voucher from '../models/voucherModel.js'
import { createNotification } from './notificationController.js'
import { computeFlashSale } from '../utils/flashSale.js'


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

async function deductStockByColor(orderItems) {
  const Product = (await import('../models/productModel.js')).default

  for (const item of orderItems) {
    try {
      const product = await Product.findById(item.product)
      if (!product) continue

      if (product.colors && product.colors.length > 0 && item.color) {

        const colorIndex = product.colors.findIndex(
          (c) => c.name === item.color
        )
        if (colorIndex !== -1) {
          product.colors[colorIndex].countInStock = Math.max(
            0,
            product.colors[colorIndex].countInStock - item.qty
          )

          await product.save()
          console.log(
            `✅ Trừ stock: ${product.name} [${item.color}] -${item.qty} → còn ${product.colors[colorIndex].countInStock}`
          )
        }
      } else {

        product.countInStock = Math.max(0, product.countInStock - item.qty)
        await product.save()
      }
    } catch (e) {
      console.error(`❌ Lỗi trừ stock sản phẩm ${item.product}:`, e.message)
    }
  }
}

// ── MỚI (A3): danh sách 12 trạng thái hợp lệ + helper ────────────
const ORDER_STATUSES = [
  'pending', 'confirmed', 'packing', 'waiting_pickup', 'picked_up',
  'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed',
  'returning', 'returned', 'cancelled',
]

const pushStatusHistory = (order, status, note = '', changedBy = null) => {
  order.status = status
  order.statusHistory.push({
    status,
    note: note || '',
    changedAt: new Date(),
    changedBy: changedBy || undefined,
  })
}

// ── MỚI: nhãn tiếng Việt cho từng trạng thái — dùng để soạn nội dung
// thông báo gửi cho khách hàng khi trạng thái đơn hàng thay đổi ────
const ORDER_STATUS_LABELS_VI = {
  pending:          'Đơn hàng đã được đặt thành công',
  confirmed:        'Đơn hàng đã được xác nhận',
  packing:          'Đơn hàng đang được đóng gói',
  waiting_pickup:   'Đơn hàng đang chờ đơn vị vận chuyển lấy hàng',
  picked_up:        'Đơn vị vận chuyển đã lấy hàng',
  in_transit:       'Đơn hàng đang được vận chuyển',
  out_for_delivery: 'Đơn hàng đang được giao đến bạn',
  delivered:        'Đơn hàng đã giao thành công',
  delivery_failed:  'Giao hàng không thành công',
  returning:        'Đơn hàng đang được hoàn về kho',
  returned:         'Đơn hàng đã hoàn về kho',
  cancelled:        'Đơn hàng đã bị hủy',
}

// Helper: bắn thông báo trạng thái đơn hàng cho KHÁCH HÀNG (chủ đơn)
const notifyCustomerOrderStatus = async (order, status) => {
  await createNotification({
    type: 'order_status',
    title: `Đơn #${order._id.toString().slice(-6).toUpperCase()}: ${ORDER_STATUS_LABELS_VI[status] || status}`,
    message: '',
    link: `/order/${order._id}`,
    order: order._id,
    user: order.user,
  })
}

// ═══════════════ B1: Hạn chế COD với tài khoản giao hàng thất bại ═══════════════

const COD_FAIL_THRESHOLD = 2 // ngưỡng số lần giao thất bại để khóa COD

// Gửi email thông báo cho khách khi bị hạn chế / được mở lại COD
const sendCodStatusEmail = async (user, { restricted }) => {
  try {
    const gmailUser = (process.env.GMAIL_USER || '').trim()
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
    if (!gmailUser || !gmailAppPassword) return

    const createTransporter = (await import('../config/emailConfig.js')).default
    const transporter = createTransporter()

    const subject = restricted
      ? 'HariShop - Tài khoản của bạn đã bị hạn chế thanh toán COD'
      : 'HariShop - Tài khoản của bạn đã được mở lại COD'

    const html = restricted
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b6b;">Chào ${user.name || 'Khách hàng'},</h2>
          <p>Tài khoản của bạn tại HariShop đã có <strong>${user.codFailCount} lần giao hàng thất bại</strong>
          (COD), nên hiện tại <strong>không thể chọn thanh toán khi nhận hàng (COD)</strong> cho các đơn hàng tiếp theo.</p>
          <p>Bạn vẫn có thể tiếp tục mua sắm bình thường bằng hình thức <strong>chuyển khoản / QR Code</strong>.</p>
          <p>Nếu đơn hàng kế tiếp được giao thành công, hệ thống sẽ <strong>tự động mở lại COD</strong> cho bạn.
          Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ shop để được hỗ trợ.</p>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
          <p>HariShop xác nhận tài khoản của bạn đã được <strong>mở lại quyền thanh toán khi nhận hàng (COD)</strong>.</p>
          <p>Bạn có thể tiếp tục sử dụng COD bình thường cho các đơn hàng tiếp theo. Cảm ơn bạn đã đồng hành cùng HariShop!</p>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
        </div>
      `

    await transporter.sendMail({ from: `"HariShop" <${gmailUser}>`, to: user.email, subject, html })
  } catch (e) {
    console.warn('⚠️ Không gửi được email thông báo COD (non-fatal):', e.message)
  }
}

// Gọi mỗi khi trạng thái đơn hàng đổi sang 'delivery_failed' hoặc 'delivered'
// để tăng/khôi phục codFailCount và bật/tắt codRestricted cho user tương ứng.
const handleCodRestrictionOnStatusChange = async (order, status) => {
  try {
    if (status !== 'delivery_failed' && status !== 'delivered') return

    const User = (await import('../models/userModel.js')).default
    const user = await User.findById(order.user)
    if (!user) return

    if (status === 'delivery_failed') {
      user.codFailCount = (user.codFailCount || 0) + 1

      if (user.codFailCount >= COD_FAIL_THRESHOLD && !user.codRestricted) {
        user.codRestricted = true
        user.codRestrictedAt = new Date()
        await user.save()

        await sendCodStatusEmail(user, { restricted: true })

        // Báo Admin
        await createNotification({
          type: 'cod_restricted',
          title: `Khách "${user.name}" bị hạn chế COD (${user.codFailCount} lần giao thất bại)`,
          message: `Đơn #${order._id.toString().slice(-6).toUpperCase()}`,
          link: `/admin/user/${user._id}/edit`,
        })
        // Báo khách
        await createNotification({
          type: 'cod_restricted_customer',
          title: 'Tài khoản của bạn đã bị hạn chế thanh toán COD',
          message: `Do có ${user.codFailCount} đơn giao hàng không thành công, bạn chỉ có thể thanh toán trước qua QR cho các đơn tiếp theo.`,
          link: `/profile`,
          user: user._id,
        })
      } else {
        await user.save()
      }
    }

    if (status === 'delivered' && user.codRestricted) {
      user.codRestricted = false
      user.codFailCount = 0
      user.codUnlockedAt = new Date()
      await user.save()

      await sendCodStatusEmail(user, { restricted: false })

      await createNotification({
        type: 'cod_unlocked',
        title: 'Tài khoản của bạn đã được mở lại thanh toán COD',
        message: 'Đơn hàng gần nhất của bạn đã giao thành công.',
        link: `/profile`,
        user: user._id,
      })
    }
  } catch (e) {
    console.error('❌ Lỗi xử lý hạn chế COD (non-fatal, B1):', e.message)
  }
}

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

  // ── MỚI (B1): chặn ở backend nếu tài khoản đang bị hạn chế COD (tránh bypass frontend) ──
  if (paymentMethod === 'cod') {
    const User = (await import('../models/userModel.js')).default
    const currentUser = await User.findById(req.user._id).select('codRestricted codFailCount')
    if (currentUser?.codRestricted) {
      res.status(400)
      throw new Error('Tài khoản của bạn đang bị hạn chế thanh toán khi nhận hàng (COD) do có nhiều lần giao hàng thất bại. Vui lòng chọn thanh toán trước qua QR Code.')
    }
  }

  if (isNaN(itemsPrice) || itemsPrice < 0) { res.status(400); throw new Error('Invalid items price') }
  if (isNaN(totalPrice) || totalPrice <= 0) { res.status(400); throw new Error('Invalid total price') }

  // ── MỚI (B8): kiểm tra lại GIÁ THẬT của từng sản phẩm ngay trước khi tạo đơn ──
  // Phòng trường hợp Flash Sale đã hết hạn (hoặc giá đổi) trong lúc khách đang thanh
  // toán mà chưa quay lại giỏ hàng để đồng bộ giá, hoặc dữ liệu gửi lên bị chỉnh sửa.
  // Nếu có bất kỳ sản phẩm nào lệch giá → từ chối tạo đơn, yêu cầu khách xem lại giỏ hàng
  // (an toàn hơn nhiều so với việc âm thầm tự tính lại tổng tiền).
  const productIds = [...new Set(orderItems.map((item) => item.product))]
  const currentProducts = await Product.find({ _id: { $in: productIds } }).lean()
  const productMap = {}
  currentProducts.forEach((p) => { productMap[p._id.toString()] = p })

  const priceMismatches = []
  for (const item of orderItems) {
    const p = productMap[item.product?.toString()]
    if (!p) continue // sản phẩm không còn tồn tại — sẽ được xử lý ở bước khác nếu cần
    const { isFlashSaleActive, salePrice } = computeFlashSale(p)
    const currentPrice = isFlashSaleActive ? salePrice : p.price
    if (currentPrice !== item.price) {
      priceMismatches.push({ name: item.name, oldPrice: item.price, newPrice: currentPrice })
    }
  }

  if (priceMismatches.length > 0) {
    res.status(409)
    const detail = priceMismatches.map((m) => `${m.name}: ${m.oldPrice.toLocaleString('vi-VN')}đ → ${m.newPrice.toLocaleString('vi-VN')}đ`).join('; ')
    throw new Error(`Giá của ${priceMismatches.length} sản phẩm đã thay đổi (có thể do khuyến mãi vừa kết thúc): ${detail}. Vui lòng quay lại giỏ hàng để cập nhật giá mới nhất trước khi đặt hàng.`)
  }

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

    orderItems: orderItems.map((item) => ({

      name:    item.name,
      qty:     item.qty,
      image:   item.image,
      price:   item.price,
      weight:  item.weight || 0,
      color:   item.color || '',

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
    // ── MỚI (A3): khởi tạo trạng thái timeline ──────────────────
    status: 'pending',
    statusHistory: [
      { status: 'pending', note: 'Đơn hàng đã được đặt thành công', changedAt: new Date() },
    ],
  })

  const createdOrder = await order.save()

  // ─────────────────────────────────────────────────────────────
  // MỚI: tăng usedCount khi đặt hàng thành công (non-blocking)
  // ─────────────────────────────────────────────────────────────
  try {
    const voucherCode = String(createdOrder?.voucherCode || '').trim().toUpperCase()
    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode }).lean()
      if (voucher) {
        const isActive = voucher.isActive === true
        const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt) : null
        const now = new Date()
        const notExpired = expiresAt ? expiresAt.getTime() > now.getTime() : true

        const usageLimit = Number(voucher.usageLimit || 0)
        const usedCount = Number(voucher.usedCount || 0)
        const hasRemaining = usageLimit === 0 ? true : usedCount < usageLimit

        const minOrder = Number(voucher.minOrder || 0)
        const orderAmount = Number(createdOrder?.itemsPrice || 0)
        const meetsMin = orderAmount >= minOrder

        if (isActive && notExpired && hasRemaining && meetsMin) {
          const condition = { code: voucherCode, isActive: true }
          if (usageLimit > 0) {
            condition.usedCount = { $lt: usageLimit }
          }

          await Voucher.findOneAndUpdate(
            condition,
            { $inc: { usedCount: 1 } },
            { new: false }
          )
        }
      }
    }
  } catch (e) {
    console.error('❌ Voucher usedCount update error (non-fatal):', e.message)
  }

  try {
    await deductStockByColor(createdOrder.orderItems)
  } catch (e) {
    console.error('❌ deductStockByColor error (non-fatal):', e.message)
  }



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

  // ── MỚI: thông báo Admin có đơn hàng mới ──────────────────────
  await createNotification({
    type: 'new_order',
    title: `Đơn hàng mới #${createdOrder._id.toString().slice(-6).toUpperCase()}`,
    message: `${req.user.name} vừa đặt đơn trị giá ${Number(createdOrder.totalPrice).toLocaleString('vi-VN')}đ`,
    link: `/order/${createdOrder._id}`,
    order: createdOrder._id,
  })

  // ── MỚI: thông báo cho KHÁCH HÀNG đặt hàng thành công ──────────
  await createNotification({
    type: 'order_placed',
    title: `Đơn #${createdOrder._id.toString().slice(-6).toUpperCase()} đã được đặt thành công`,
    message: `Tổng tiền: ${Number(createdOrder.totalPrice).toLocaleString('vi-VN')}đ`,
    link: `/order/${createdOrder._id}`,
    order: createdOrder._id,
    user: createdOrder.user,
  })

  res.status(201).json(createdOrder)
})

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email codRestricted codFailCount')
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

// @desc    Admin đánh dấu đã thu tiền / chưa thu tiền cho đơn hàng thanh toán COD
// @route   PUT /api/orders/:id/cod-payment
// @access  Private/Admin
const updateCodPaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) {
    res.status(404)
    throw new Error('Order not found')
  }

  if (order.paymentMethod !== 'cod') {
    res.status(400)
    throw new Error('Chức năng này chỉ áp dụng cho đơn hàng thanh toán khi nhận hàng (COD).')
  }

  const { isPaid } = req.body
  if (typeof isPaid !== 'boolean') {
    res.status(400)
    throw new Error('Thiếu hoặc sai định dạng trạng thái thanh toán (isPaid phải là true/false).')
  }

  order.isPaid = isPaid
  order.paidAt = isPaid ? (order.paidAt || new Date()) : null

  const updatedOrder = await order.save()
  res.json(updatedOrder)
})

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (order) {
    order.isDelivered = true
    order.deliveredAt = Date.now()
    // ── MỚI (A3): đồng bộ với timeline trạng thái ─────────────
    pushStatusHistory(order, 'delivered', 'Giao hàng thành công', req.user?._id)
    const updatedOrder = await order.save()

    // ── MỚI: thông báo giao hàng thành công (Admin) ────────────
    await createNotification({
      type: 'order_delivered',
      title: `Đơn #${order._id.toString().slice(-6).toUpperCase()} đã giao thành công`,
      message: `Doanh thu: ${Number(order.totalPrice).toLocaleString('vi-VN')}đ`,
      link: `/order/${order._id}`,
      order: order._id,
    })

    // ── MỚI: thông báo cho KHÁCH HÀNG ──────────────────────────
    await notifyCustomerOrderStatus(order, 'delivered')

    // ── MỚI (B1): reset hạn chế COD nếu giao thành công ────────
    await handleCodRestrictionOnStatusChange(order, 'delivered')

    res.json(updatedOrder)
  } else {
    res.status(404); throw new Error('Order not found')
  }
})

// @desc    Admin cập nhật trạng thái đơn hàng chi tiết (timeline)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body

  if (!status || !ORDER_STATUSES.includes(status)) {
    res.status(400)
    throw new Error(`Trạng thái không hợp lệ. Phải là một trong: ${ORDER_STATUSES.join(', ')}`)
  }

  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }

  pushStatusHistory(order, status, note, req.user?._id)

  // ── Đồng bộ các cờ cũ (isDelivered/isCancelled) để tương thích
  // ngược với các phần code khác đang dùng isDelivered/isCancelled ──
  if (status === 'delivered') {
    order.isDelivered = true
    order.deliveredAt = order.deliveredAt || new Date()
  }
  if (status === 'cancelled') {
    order.isCancelled = true
    order.cancelledAt = order.cancelledAt || new Date()
  }

  const updatedOrder = await order.save()

  // ── MỚI: thông báo Admin khi trạng thái chuyển sang giao thành công ──
  if (status === 'delivered') {
    await createNotification({
      type: 'order_delivered',
      title: `Đơn #${order._id.toString().slice(-6).toUpperCase()} đã giao thành công`,
      message: `Doanh thu: ${Number(order.totalPrice).toLocaleString('vi-VN')}đ`,
      link: `/order/${order._id}`,
      order: order._id,
    })
  }

  // ── MỚI: thông báo cho KHÁCH HÀNG ở MỌI lần thay đổi trạng thái ──
  await notifyCustomerOrderStatus(order, status)

  // ── MỚI (B1): tăng codFailCount / khóa COD khi giao thất bại, reset khi giao thành công ──
  await handleCodRestrictionOnStatusChange(order, status)

  res.json(updatedOrder)
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

// ── MỚI (A3): map trạng thái GHN sang 12 trạng thái nội bộ ───────
const GHN_TO_ORDER_STATUS = {
  ready_to_pick: 'waiting_pickup',
  picking:       'waiting_pickup',
  money_collect_picking: 'waiting_pickup',
  picked:        'picked_up',
  storing:       'in_transit',
  transporting:  'in_transit',
  sorting:       'in_transit',
  delivering:    'out_for_delivery',
  money_collect_delivering: 'out_for_delivery',
  delivered:     'delivered',
  delivery_fail: 'delivery_failed',
  waiting_to_return: 'returning',
  return:        'returning',
  returned:      'returned',
  cancel:        'cancelled',
}

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

    // ── MỚI (A3): tự động cập nhật status nội bộ theo GHN nếu khác ──
    const mappedStatus = GHN_TO_ORDER_STATUS[ghnOrder?.status]
    if (mappedStatus && mappedStatus !== order.status && !order.isCancelled) {
      pushStatusHistory(order, mappedStatus, `Tự động cập nhật từ GHN (${ghnOrder?.status})`)
      await order.save()
      // ── MỚI: thông báo cho KHÁCH HÀNG ────────────────────────
      await notifyCustomerOrderStatus(order, mappedStatus)
      // ── MỚI (B1): xử lý hạn chế COD theo trạng thái mới từ GHN ──
      await handleCodRestrictionOnStatusChange(order, mappedStatus)
    }

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

  // ── MỚI: thông báo Admin có yêu cầu huỷ đơn ─────────────────
  await createNotification({
    type: 'cancel_request',
    title: `Yêu cầu huỷ đơn #${order._id.toString().slice(-6).toUpperCase()}`,
    message: req.body.reason ? `Lý do: ${req.body.reason}` : 'Khách hàng yêu cầu huỷ đơn',
    link: `/order/${order._id}`,
    order: order._id,
  })

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

  // ── Hoàn lại usedCount voucher khi Admin chấp thuận hủy ────────
  if (order.voucherCode) {
    try {
      await Voucher.findOneAndUpdate(
        { code: order.voucherCode, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      )
      console.log(`✅ Hoàn usedCount voucher (cancel): ${order.voucherCode}`)
    } catch (e) {
      console.error('❌ Lỗi hoàn usedCount voucher (non-fatal):', e.message)
    }
  }

  order.isCancelled  = true
  order.cancelledAt  = Date.now()
  order.cancelReason = order.cancelRequest?.reason || ''
  order.cancelRequest = { requested: false, reason: '', requestedAt: null }
  // ── MỚI (A3): đồng bộ với timeline trạng thái ─────────────────
  pushStatusHistory(order, 'cancelled', order.cancelReason || 'Đơn hàng đã bị hủy', req.user?._id)

  const updatedOrder = await order.save()

  // ── MỚI: thông báo cho KHÁCH HÀNG đơn đã được huỷ ──────────────
  await createNotification({
    type: 'cancel_approved',
    title: `Đơn #${order._id.toString().slice(-6).toUpperCase()} đã được hủy`,
    message: order.cancelReason ? `Lý do: ${order.cancelReason}` : '',
    link: `/order/${order._id}`,
    order: order._id,
    user: order.user,
  })

  res.json(updatedOrder)
})

const rejectCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  const reason = req.body?.reason || ''
  order.cancelRequest = { requested: false, reason: '', requestedAt: null }
  const updatedOrder = await order.save()

  // ── MỚI: thông báo cho KHÁCH HÀNG yêu cầu huỷ bị từ chối ────────
  await createNotification({
    type: 'cancel_rejected',
    title: `Yêu cầu hủy đơn #${order._id.toString().slice(-6).toUpperCase()} đã bị từ chối`,
    message: reason ? `Lý do: ${reason}` : 'Đơn hàng của bạn vẫn đang được xử lý bình thường.',
    link: `/order/${order._id}`,
    order: order._id,
    user: order.user,
  })

  res.json(updatedOrder)
})

// ═══════════════ A5: Hoàn tiền khi giao hàng thất bại ═══════════════

// @desc    Khách gửi yêu cầu hoàn tiền (đơn đã thanh toán nhưng giao thất bại/hoàn hàng)
// @route   PUT /api/orders/:id/refund-request
// @access  Private
const requestRefund = asyncHandler(async (req, res) => {
  const { bankName, accountNumber, accountHolder, reason } = req.body

  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401); throw new Error('Không có quyền')
  }
  if (!order.isPaid) {
    res.status(400); throw new Error('Đơn hàng chưa thanh toán, không thể yêu cầu hoàn tiền')
  }
  if (!['delivery_failed', 'returned'].includes(order.status)) {
    res.status(400)
    throw new Error('Chỉ có thể yêu cầu hoàn tiền khi giao hàng thất bại hoặc hàng đã hoàn về kho')
  }
  if (order.refundStatus === 'requested' || order.refundStatus === 'completed') {
    res.status(400); throw new Error('Đơn hàng đã có yêu cầu hoàn tiền trước đó')
  }
  if (!bankName || !accountNumber || !accountHolder) {
    res.status(400); throw new Error('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng')
  }

  order.refundStatus = 'requested'
  order.refundRequestedAt = new Date()
  order.refundReason = reason || ''
  order.refundBankInfo = { bankName, accountNumber, accountHolder }
  const updatedOrder = await order.save()

  // ── Thông báo cho Admin ─────────────────────────────────────
  await createNotification({
    type: 'refund_request',
    title: `Yêu cầu hoàn tiền đơn #${order._id.toString().slice(-6).toUpperCase()}`,
    message: `Số tiền: ${Number(order.totalPrice).toLocaleString('vi-VN')}đ — STK: ${accountNumber} (${bankName})`,
    link: `/order/${order._id}`,
    order: order._id,
  })

  res.json(updatedOrder)
})

// @desc    Admin đánh dấu đã hoàn tiền cho khách
// @route   PUT /api/orders/:id/refund-complete
// @access  Private/Admin
const completeRefund = asyncHandler(async (req, res) => {
  const { refundAmount, note } = req.body

  const order = await Order.findById(req.params.id)
  if (!order) { res.status(404); throw new Error('Không tìm thấy đơn hàng') }
  if (order.refundStatus !== 'requested') {
    res.status(400); throw new Error('Đơn hàng không có yêu cầu hoàn tiền đang chờ xử lý')
  }

  order.refundStatus = 'completed'
  order.refundAmount = Number(refundAmount) || order.totalPrice
  order.refundAt = new Date()
  order.refundNote = note || ''
  const updatedOrder = await order.save()

  // ── Gửi email xác nhận hoàn tiền cho khách ──────────────────
  try {
    const gmailUser = (process.env.GMAIL_USER || '').trim()
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
    if (gmailUser && gmailAppPassword) {
      const populatedOrder = await Order.findById(order._id).populate('user', 'name email')
      const createTransporter = (await import('../config/emailConfig.js')).default
      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"HariShop" <${gmailUser}>`,
        to: populatedOrder.user.email,
        subject: `HariShop - Xác nhận hoàn tiền đơn hàng #${order._id.toString().slice(-6).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33FFCC;">Chào ${populatedOrder.user.name},</h2>
            <p>HariShop xác nhận đã hoàn tiền cho đơn hàng <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong> của bạn.</p>
            <div style="background: #1a1a2e; color: #33FFCC; padding: 16px 20px; border-radius: 12px;
                        font-size: 20px; font-weight: bold; margin: 16px 0;">
              Số tiền hoàn: ${order.refundAmount.toLocaleString('vi-VN')}đ
            </div>
            <p><strong>Thời gian hoàn tiền:</strong> ${order.refundAt.toLocaleString('vi-VN')}</p>
            <p>Số tiền sẽ được chuyển vào tài khoản ngân hàng bạn đã cung cấp trong vòng 1-3 ngày làm việc (tuỳ ngân hàng).</p>
            ${note ? `<p><strong>Ghi chú:</strong> ${note}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
          </div>
        `,
      })
    }
  } catch (e) {
    console.warn('⚠️ Không gửi được email xác nhận hoàn tiền (non-fatal):', e.message)
  }

  // ── MỚI: thông báo cho KHÁCH HÀNG đã hoàn tiền ─────────────────
  await createNotification({
    type: 'refund_completed',
    title: `Đơn #${order._id.toString().slice(-6).toUpperCase()} đã được hoàn tiền`,
    message: `Số tiền: ${order.refundAmount.toLocaleString('vi-VN')}đ`,
    link: `/order/${order._id}`,
    order: order._id,
    user: order.user,
  })

  res.json(updatedOrder)
})

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

// ═══════════════ A4: Thống kê doanh thu nâng cao ═══════════════
// @desc    Thống kê doanh thu chi tiết theo tháng/quý/năm/tùy chọn
// @route   GET /api/orders/admin/analytics/revenue
// @access  Private/Admin
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', month, year, quarter, startDate, endDate } = req.query
  const now = new Date()
  const y = year ? Number(year) : now.getFullYear()

  let start, end, prevStart, prevEnd, label, prevLabel

  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate); start.setHours(0, 0, 0, 0)
    end = new Date(endDate); end.setHours(23, 59, 59, 999)
    const durationMs = end.getTime() - start.getTime()
    prevEnd = new Date(start.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - durationMs)
    label = `${startDate} → ${endDate}`
    prevLabel = 'Kỳ liền trước'
  } else if (period === 'year') {
    start = new Date(y, 0, 1)
    end = new Date(y, 11, 31, 23, 59, 59, 999)
    prevStart = new Date(y - 1, 0, 1)
    prevEnd = new Date(y - 1, 11, 31, 23, 59, 59, 999)
    label = `Năm ${y}`
    prevLabel = `Năm ${y - 1}`
  } else if (period === 'quarter') {
    const q = quarter ? Number(quarter) : Math.floor(now.getMonth() / 3) + 1
    const startMonth = (q - 1) * 3
    start = new Date(y, startMonth, 1)
    end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999)
    const prevQ = q === 1 ? 4 : q - 1
    const prevY = q === 1 ? y - 1 : y
    const prevStartMonth = (prevQ - 1) * 3
    prevStart = new Date(prevY, prevStartMonth, 1)
    prevEnd = new Date(prevY, prevStartMonth + 3, 0, 23, 59, 59, 999)
    label = `Quý ${q}/${y}`
    prevLabel = `Quý ${prevQ}/${prevY}`
  } else {
    // 'month' (mặc định)
    const m = month ? Number(month) - 1 : now.getMonth()
    start = new Date(y, m, 1)
    end = new Date(y, m + 1, 0, 23, 59, 59, 999)
    const prevM = m === 0 ? 11 : m - 1
    const prevY = m === 0 ? y - 1 : y
    prevStart = new Date(prevY, prevM, 1)
    prevEnd = new Date(prevY, prevM + 1, 0, 23, 59, 59, 999)
    label = `Tháng ${m + 1}/${y}`
    prevLabel = `Tháng ${prevM + 1}/${prevY}`
  }

  // "Thành công" = status delivered — dùng chung hằng số DELIVERED_MATCH
  const deliveredMatch = DELIVERED_MATCH

  // 1) Doanh thu theo từng ngày trong kỳ hiện tại (chỉ tính đơn delivered)
  const dailyAgg = await Order.aggregate([
    { $match: { ...deliveredMatch, deliveredAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])
  const dailyRevenue = dailyAgg.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders }))

  // 2) So sánh doanh thu kỳ này vs kỳ trước
  const [currentAgg] = await Order.aggregate([
    { $match: { ...deliveredMatch, deliveredAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
  ])
  const [prevAgg] = await Order.aggregate([
    { $match: { ...deliveredMatch, deliveredAt: { $gte: prevStart, $lte: prevEnd } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
  ])

  // 3) Thẻ thống kê nhanh — tính trên toàn bộ đơn ĐƯỢC TẠO trong kỳ
  //    (không chỉ delivered) để ra tỷ lệ thành công / tỷ lệ hủy chính xác
  const allOrdersInPeriod = await Order.find({ createdAt: { $gte: start, $lte: end } })
    .select('status isDelivered isCancelled totalPrice')
    .lean()

  const totalOrders = allOrdersInPeriod.length
  const successOrders = allOrdersInPeriod.filter(
    (o) => o.status === 'delivered' || (!o.status && o.isDelivered)
  ).length
  const cancelledOrders = allOrdersInPeriod.filter(
    (o) => o.status === 'cancelled' || (!o.status && o.isCancelled)
  ).length

  const successRate = totalOrders > 0 ? (successOrders / totalOrders) * 100 : 0
  const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0

  // 4) Top 5 sản phẩm bán chạy nhất theo doanh thu (chỉ tính đơn delivered)
  const deliveredOrders = await Order.find({
    ...deliveredMatch,
    deliveredAt: { $gte: start, $lte: end },
  }).select('orderItems').lean()

  const productMap = new Map()
  for (const o of deliveredOrders) {
    for (const it of o.orderItems || []) {
      const pid = it.product ? String(it.product) : it.name
      const existing = productMap.get(pid) || {
        productId: it.product ? String(it.product) : null,
        name: it.name,
        image: it.image,
        qty: 0,
        revenue: 0,
      }
      existing.qty += Number(it.qty) || 0
      existing.revenue += (Number(it.price) || 0) * (Number(it.qty) || 0)
      productMap.set(pid, existing)
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  res.json({
    period,
    label,
    dailyRevenue,
    comparison: {
      current:  { label,     total: currentAgg?.total || 0, count: currentAgg?.count || 0 },
      previous: { label: prevLabel, total: prevAgg?.total || 0, count: prevAgg?.count || 0 },
    },
    stats: {
      totalRevenue: currentAgg?.total || 0,
      successOrders,
      totalOrders,
      cancelledOrders,
      successRate: Math.round(successRate * 10) / 10,
      cancelRate: Math.round(cancelRate * 10) / 10,
    },
    topProducts,
  })
})

// "Thành công" = status delivered — fallback isDelivered cho đơn cũ chưa có field status
// Dùng chung cho revenue-summary, brand-breakdown và analytics/revenue
const DELIVERED_MATCH = {
  $or: [
    { status: 'delivered' },
    { status: { $exists: false }, isDelivered: true },
  ],
}

// Admin: revenue summary — CHỈ tính đơn hàng đã giao thành công (status = delivered)
const getAdminRevenueSummary = asyncHandler(async (req, res) => {
  const months = Number(req.query.months || 1)
  const safeMonths = !isNaN(months) && months > 0 ? months : 1
  const now = new Date()
  const fromDate = new Date(now)
  fromDate.setMonth(fromDate.getMonth() - safeMonths)

  const [agg] = await Order.aggregate([
    { $match: { ...DELIVERED_MATCH, deliveredAt: { $gte: fromDate } } },
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
    ...DELIVERED_MATCH, deliveredAt: { $gte: fromDate },
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

  if (order.voucherCode) {
    try {
      await Voucher.findOneAndUpdate(
        { code: order.voucherCode, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      )
      console.log(`✅ Hoàn usedCount voucher (delete): ${order.voucherCode}`)
    } catch (e) {
      console.error('❌ Lỗi hoàn usedCount voucher khi xóa (non-fatal):', e.message)
    }
  }

  await Order.findByIdAndDelete(req.params.id)
  res.json({ message: 'Order deleted', orderId: req.params.id })
})

export {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateCodPaymentStatus,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  trackOrder,
  cancelOrderRequest,
  approveCancelOrder,
  rejectCancelOrder,
  requestRefund,
  completeRefund,
  sepayWebhook,
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  getRevenueAnalytics,
  deleteOrderByAdmin,
}