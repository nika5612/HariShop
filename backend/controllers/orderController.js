import asyncHandler from 'express-async-handler'
import crypto from 'crypto'
import mongoose from 'mongoose'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import Settings from '../models/settingsModel.js'
import Voucher from '../models/voucherModel.js'
import { applyVoucherLogic } from './voucherController.js'
import { resolvePeriodRange } from '../utils/reportPeriod.js'
import { createNotification } from './notificationController.js'
import { computeFlashSale } from '../utils/flashSale.js'
import ghtkProvider from '../services/shipping/providers/ghtk.js'
import logger from '../utils/logger.js'

function isSandbox() {
  return (process.env.GHN_USE_SANDBOX || '').trim() === 'true'
}
function getGhnBaseUrl() {
  return isSandbox()
    ? 'https://dev-online-gateway.ghn.vn/shiip/public-api'
    : 'https://online-gateway.ghn.vn/shiip/public-api'
}

function ghnCredentials() {
  const trim = (keys) => {
    for (const k of keys) {
      const v = (process.env[k] || '').trim()
      if (v) return v
    }
    return ''
  }
  const token = isSandbox()
    ? trim(['GHN_TOKEN_DEV'])
    : trim(['GHN_TOKEN', 'TOKEN_GHN'])
  const shopId = isSandbox()
    ? trim(['GHN_SHOP_ID_DEV'])
    : trim(['GHN_SHOP_ID', 'ID_GHN'])
  return { token, shopId }
}

async function ghnFetchJson(path, { token, shopId, method = 'POST', body } = {}) {
  const headers = { 'Content-Type': 'application/json', Token: token }
  if (shopId) headers.ShopId = String(shopId)
  const res = await fetch(`${getGhnBaseUrl()}${path}`, {
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

// MỚI: Tạo đơn thật lên GHTK (giống createGHNOrder nhưng theo đúng API GHTK).
// Khác GHN: GHTK dùng TÊN Tỉnh/Huyện/Xã dạng chữ, không dùng mã số.
async function createGHTKOrder(order, warehouseAddress) {
  const token = (process.env.GHTK_TOKEN || '').trim()
  if (!token) {
    console.warn('⚠️ GHTK_TOKEN chưa cấu hình — bỏ qua tạo vận đơn GHTK')
    return null
  }

  const addr = order.shippingAddress
  const pickProvince = warehouseAddress?.province || ''
  const pickDistrict = warehouseAddress?.district || ''

  if (!pickProvince || !pickDistrict || !addr?.province || !addr?.district) {
    console.warn('⚠️ Thiếu tên Tỉnh/Huyện (kho hàng hoặc địa chỉ giao) — bỏ qua tạo vận đơn GHTK')
    return null
  }

  // GHTK dùng KG cho trọng lượng sản phẩm trong payload đơn hàng (khác API tính
  // phí dùng gram) — order.totalWeight của bạn đang lưu theo gram nên đổi lại.
  const rawCodAmount = order.paymentMethod === 'cod' ? Number(order.totalPrice || 0) : 0
  // GHTK quy định COD tối đa 50 triệu/đơn (khác giới hạn 300k tự đặt cho GHN ở trên)
  const codAmount = Math.min(rawCodAmount, 50000000)

  // Mã đơn nội bộ gửi cho GHTK — phải DUY NHẤT, dùng luôn _id đơn hàng của mình
  const partnerOrderId = `HS-${order._id}`

  const payload = {
    products: (order.orderItems || []).map((item) => ({
      name: String(item.name || 'Sản phẩm'),
      weight: Math.max(0.001, Number(item.weight || 200) / 1000), // gram → kg
      quantity: Number(item.qty || 1),
      product_code: String(item.product || ''),
    })),
    order: {
      id: partnerOrderId,
      pick_name: warehouseAddress?.fullName || 'HariShop',
      pick_address: warehouseAddress?.detail || '',
      pick_province: pickProvince,
      pick_district: pickDistrict,
      pick_ward: warehouseAddress?.ward || '',
      pick_tel: warehouseAddress?.phone || '',
      tel: addr.phone || '',
      name: addr.fullName || '',
      address: addr.detail || '',
      province: addr.province,
      district: addr.district,
      ward: addr.ward || '',
      hamlet: 'Khác',
      is_freeship: '1', // phí ship đã tính riêng trong đơn của mình, GHTK chỉ thu đúng pick_money
      pick_money: codAmount,
      note: order.shopMessage || '',
      value: Math.min(Number(order.itemsPrice || 0), 50000000),
      transport: 'road',
    },
  }

  const headers = { 'Content-Type': 'application/json', Token: token }
  // ⚠️ Một số tài khoản GHTK (đối tác chính thức) bắt buộc thêm header này khi
  // TẠO ĐƠN thật (khác API tính phí không cần). Nếu GHTK báo lỗi thiếu thông
  // tin đối tác, cần xin mã X-Client-Source từ GHTK rồi điền GHTK_PARTNER_CODE.
  const partnerCode = (process.env.GHTK_PARTNER_CODE || '').trim()
  if (partnerCode) headers['X-Client-Source'] = partnerCode

  try {
    const res = await fetch('https://services.giaohangtietkiem.vn/services/shipment/order/?ver=1.5', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `GHTK error (HTTP ${res.status})`)
    }
    console.log('✅ GHTK order created:', data?.order?.label)
    return { ...data?.order, partnerOrderId } || null
  } catch (e) {
    console.error('❌ GHTK create order failed:', e.message)
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

  // ── MỚI: validate voucher TRƯỚC KHI tạo đơn (fail-fast). Trước đây
  // việc kiểm tra voucher chạy SAU khi đơn đã được lưu — nếu voucher hoá
  // ra không hợp lệ (hết lượt/hết hạn/vượt giới hạn user) thì đơn vẫn
  // được tạo với giảm giá đã tính sẵn, chỉ là usedCount không tăng. Giờ
  // nếu voucher không hợp lệ, từ chối tạo đơn ngay — đúng yêu cầu "Nếu
  // không hợp lệ → Không tạo đơn, trả lỗi tương ứng".
  let voucherDoc = null
  const normalizedVoucherCode = String(voucherCode || '').trim().toUpperCase()
  if (normalizedVoucherCode) {
    voucherDoc = await Voucher.findOne({ code: normalizedVoucherCode })
    if (!voucherDoc) {
      res.status(400)
      throw new Error('Mã voucher không tồn tại')
    }
    const categories = [...new Set(
      orderItems.map((item) => productMap[item.product?.toString()]?.category).filter(Boolean)
    )]
    const check = applyVoucherLogic({
      voucher: voucherDoc,
      orderAmount: itemsPrice,
      userId: req.user._id,
      shippingFee: deliveryFee || 0,
      categories,
    })
    if (!check.ok) {
      res.status(400)
      throw new Error(check.message)
    }
    // Số tiền giảm phải khớp với những gì backend tự tính — không tin số
    // frontend gửi lên (tránh gian lận sửa voucherDiscount trực tiếp).
    if (Math.abs(Number(voucherDiscount || 0) - check.discountAmount) > 1) {
      res.status(409)
      throw new Error('Số tiền giảm giá không khớp, vui lòng thử lại từ giỏ hàng.')
    }
  }

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
    voucherCode:         voucherDoc ? voucherDoc.code : '',
    voucherId:           voucherDoc ? voucherDoc._id : undefined,
    voucherName:         voucherDoc ? voucherDoc.name : '',
    discountType:        voucherDoc ? voucherDoc.type : '',
    discountValue:       voucherDoc ? voucherDoc.value : 0,
    shopMessage:         shopMessage || '',
    totalWeight,
    itemsPrice,
    deliveryFee:         deliveryFee || 0,
    voucherDiscount:     voucherDoc ? (voucherDiscount || 0) : 0,
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
  // MỚI: tăng usedCount + ghi nhận user đã dùng (non-blocking, best-effort
  // — voucher đã được validate chặt ở trên nên đây chỉ còn là ghi nhận,
  // vẫn giữ điều kiện trong findOneAndUpdate để an toàn khi có 2 request
  // cùng lúc chạm giới hạn usageLimit).
  // ─────────────────────────────────────────────────────────────
  if (voucherDoc) {
    try {
      const condition = { code: voucherDoc.code, isActive: true }
      if (Number(voucherDoc.usageLimit || 0) > 0) {
        condition.usedCount = { $lt: voucherDoc.usageLimit }
      }
      await Voucher.findOneAndUpdate(
        condition,
        {
          $inc: { usedCount: 1 },
          $push: { usedBy: { user: req.user._id, usedAt: new Date() } },
        },
        { new: false }
      )
    } catch (e) {
      console.error('❌ Voucher usedCount update error (non-fatal):', e.message)
    }
  }

  try {
    await deductStockByColor(createdOrder.orderItems)
  } catch (e) {
    console.error('❌ deductStockByColor error (non-fatal):', e.message)
  }



  // ĐÃ SỬA: bỏ '|| USE_SANDBOX' — trước đây nếu bật sandbox sẽ LUÔN cố tạo
  // đơn GHN bất kể khách chọn hãng nào (kể cả GHTK/VTP), là lỗi logic thừa.
  if (shippingProvider === 'ghn') {
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

  // MỚI: Tạo vận đơn thật lên GHTK khi khách chọn GHTK lúc checkout
  if (shippingProvider === 'ghtk') {
    try {
      const settings = await Settings.findOne({ key: 'global' }).lean().catch(() => null)
      const warehouseAddress = settings?.warehouseAddress || null

      const ghtkData = await createGHTKOrder(createdOrder, warehouseAddress)
      if (ghtkData?.label) {
        createdOrder.ghtkLabelCode = ghtkData.label
        createdOrder.ghtkPartnerId = ghtkData.partnerOrderId || ''
        await createdOrder.save()
        console.log('✅ Lưu ghtkLabelCode vào order:', ghtkData.label)
      }
    } catch (e) {
      console.error('❌ Lỗi tạo vận đơn GHTK (non-fatal):', e.message)
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

  // ── MỚI: hoàn tồn kho khi đơn kết thúc hẳn ở trạng thái 'cancelled'
  // hoặc 'returned' (khách trả hàng sau khi đã nhận). Không hoàn ở
  // 'delivery_failed' vì đơn còn có thể giao lại — chỉ hoàn khi đã
  // chắc chắn không đến tay khách. Có cờ stockRestored chống hoàn 2 lần
  // (ví dụ đơn từng được hoàn qua approveCancelOrder trước đó).
  if (status === 'cancelled' || status === 'returned') {
    await restoreStockForOrder(order)
    await revertVoucherForOrder(order)
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
// ── MỚI: sort theo cột kiểu FC Online (click header) cho trang admin
// quản lý đơn hàng. Vì "Tên khách" nằm ở collection User (ref populate)
// và "Trạng thái thanh toán"/"Trạng thái giao hàng" là dữ liệu có Ý
// NGHĨA NGHIỆP VỤ theo thứ tự riêng (không phải chuỗi để sort a-z),
// nên không thể dùng Order.find().sort() đơn thuần — phải dùng
// aggregation pipeline:
//  - $lookup + $unwind để join sang User (thay cho .populate())
//  - $addFields tính "rank" số cho paymentStatus/deliveryStatus theo
//    đúng thứ tự tiến trình nghiệp vụ, rồi sort theo rank đó.
const getOrders = asyncHandler(async (req, res) => {
  const requestedOrder = req.query.order === 'asc' ? 1 : req.query.order === 'desc' ? -1 : null
  const sortBy = req.query.sortBy
  const hasColumnSort = Boolean(sortBy) && requestedOrder !== null

  // Rank "Trạng thái giao hàng" theo đúng thứ tự tiến trình vận chuyển
  // (không sort chuỗi a-z, ví dụ "cancelled" không được đứng trước "confirmed").
  const deliveryStatusRankSwitch = {
    $switch: {
      branches: ORDER_STATUSES.map((status, index) => ({
        case: { $eq: ['$status', status] },
        then: index,
      })),
      // Đơn cũ chưa có field `status` (trước khi có timeline 12 trạng thái):
      // suy ra rank tạm từ isDelivered/isCancelled để không bị lỗi/loại khỏi sort.
      default: {
        $cond: [
          { $eq: ['$isCancelled', true] },
          ORDER_STATUSES.indexOf('cancelled'),
          {
            $cond: [
              { $eq: ['$isDelivered', true] },
              ORDER_STATUSES.indexOf('delivered'),
              ORDER_STATUSES.indexOf('pending'),
            ],
          },
        ],
      },
    },
  }

  // Rank "Trạng thái thanh toán" theo đúng ý nghĩa hiển thị ở
  // OrderListScreen (renderPaymentStatus): chưa thanh toán < yêu cầu
  // hoàn tiền < từ chối hoàn tiền < đã thanh toán < đã hoàn tiền.
  const paymentStatusRankSwitch = {
    $switch: {
      branches: [
        { case: { $eq: ['$refundStatus', 'completed'] }, then: 4 },
        { case: { $eq: ['$refundStatus', 'rejected'] }, then: 2 },
        { case: { $eq: ['$refundStatus', 'requested'] }, then: 1 },
        { case: { $eq: ['$isPaid', true] }, then: 3 },
      ],
      default: 0,
    },
  }

  const pipeline = [
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: '_userDoc' } },
    { $unwind: { path: '$_userDoc', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        user: { _id: '$_userDoc._id', name: '$_userDoc.name' },
        deliveryStatusRank: deliveryStatusRankSwitch,
        paymentStatusRank: paymentStatusRankSwitch,
      },
    },
    { $project: { _userDoc: 0 } },
  ]

  let sortStage = { createdAt: -1 } // mặc định: đơn mới nhất lên đầu
  if (hasColumnSort) {
    switch (sortBy) {
      case 'orderId':
        sortStage = { _id: requestedOrder }
        break
      case 'customerName':
        sortStage = { '_userDoc.name': requestedOrder }
        break
      case 'totalPrice':
        sortStage = { totalPrice: requestedOrder }
        break
      case 'paymentStatus':
        sortStage = { paymentStatusRank: requestedOrder }
        break
      case 'deliveryStatus':
        sortStage = { deliveryStatusRank: requestedOrder }
        break
      case 'createdAt':
        sortStage = { createdAt: requestedOrder }
        break
      default:
        sortStage = { createdAt: -1 }
    }
  }

  // customerName cần sort TRƯỚC KHI $project xoá _userDoc
  if (sortBy === 'customerName' && hasColumnSort) {
    pipeline.splice(3, 0, { $sort: sortStage })
  } else {
    pipeline.push({ $sort: sortStage })
  }

  const orders = await Order.aggregate(pipeline)
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

// ⚠️ MỚI: mapping mã trạng thái GHTK (1-12, theo tài liệu công khai của GHTK)
// sang 12 trạng thái nội bộ. GIỐNG GHI CHÚ trong services/shipping/providers/
// ghtk.js: hàm track() gọi API này CHƯA từng được đối chiếu với 1 đơn GHTK
// THẬT — nếu bạn dùng GHTK thật, nên tạo 1 đơn test, gọi thử endpoint
// /api/orders/:id/track, so sánh currentStatusCode trả về với bảng mã dưới
// đây trước khi tin tưởng hoàn toàn vào auto-sync này.
const GHTK_TO_ORDER_STATUS = {
  '1':  'pending',           // Chưa tiếp nhận
  '2':  'confirmed',         // Đã tiếp nhận
  '3':  'picked_up',         // Đã lấy hàng / đã nhập kho
  '4':  'out_for_delivery',  // Đã điều phối giao hàng / đang giao
  '5':  'delivered',         // Đã giao hàng (chưa đối soát)
  '6':  'delivered',         // Đã đối soát (giao thành công, đã chốt tiền COD)
  '7':  'delivery_failed',   // Không lấy được hàng
  '8':  'waiting_pickup',    // Hoãn lấy hàng
  '9':  'delivery_failed',   // Không giao được hàng
  '10': 'out_for_delivery',  // Delay giao hàng (vẫn đang giao, chỉ trễ)
  '11': 'cancelled',         // Hủy đơn hàng
  '12': 'returned',          // Bồi hoàn (trả hàng về, đã hoàn tiền COD)
  '13': 'in_transit',        // Delay đơn hàng (trễ chung chung)
  '20': 'pending',           // Chờ xác nhận hủy
}

// MỚI: bản GHTK của syncOrderStatusFromGHN — cấu trúc giống hệt để dễ đối
// chiếu, dùng chung các helper hoàn kho/hoàn voucher/thông báo đã có sẵn.
async function syncOrderStatusFromGHTK(order) {
  const trackingId = order.ghtkLabelCode
  if (!trackingId) {
    return { available: false, reason: 'Đơn hàng chưa có mã vận đơn GHTK' }
  }

  const { events, currentStatusCode } = await ghtkProvider.track(trackingId)

  const mappedStatus = GHTK_TO_ORDER_STATUS[currentStatusCode]
  let statusChanged = false
  if (mappedStatus && mappedStatus !== order.status && !order.isCancelled) {
    pushStatusHistory(order, mappedStatus, `Tự động cập nhật từ GHTK (mã ${currentStatusCode})`)
    if (mappedStatus === 'cancelled') {
      order.isCancelled = true
      order.cancelledAt = order.cancelledAt || new Date()
    }
    if (mappedStatus === 'delivered') {
      order.isDelivered = true
      order.deliveredAt = order.deliveredAt || new Date()
    }
    if (mappedStatus === 'cancelled' || mappedStatus === 'returned') {
      await restoreStockForOrder(order)
      await revertVoucherForOrder(order)
    }
    await order.save()
    await notifyCustomerOrderStatus(order, mappedStatus)
    await handleCodRestrictionOnStatusChange(order, mappedStatus)
    statusChanged = true
  }

  return {
    available: true,
    orderCode: trackingId,
    currentStatus: currentStatusCode,
    events,
    estimatedDelivery: order.shippingEtaDate || null,
    statusChanged,
  }
}

// MỚI: Tách phần "gọi GHN lấy trạng thái mới nhất + tự cập nhật đơn hàng nội
// bộ" ra hàm riêng — dùng chung cho cả 2 luồng:
//  1) trackOrder (thủ công — khách/admin bấm nút "Theo dõi vận chuyển")
//  2) autoSyncPendingGHNOrders (tự động — chạy định kỳ nền, xem cuối file)
// Hàm này KHÔNG đụng tới req/res, chỉ nhận vào 1 document Order và trả về
// dữ liệu tracking để nơi gọi tự quyết định làm gì tiếp (render JSON, log...).
async function syncOrderStatusFromGHN(order) {
  const orderCode = order.ghnOrderCode
  if (!orderCode) {
    return { available: false, reason: 'Đơn hàng chưa có mã vận đơn GHN' }
  }

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

  // Tự động cập nhật status nội bộ theo GHN nếu khác
  const mappedStatus = GHN_TO_ORDER_STATUS[ghnOrder?.status]
  let statusChanged = false
  if (mappedStatus && mappedStatus !== order.status && !order.isCancelled) {
    pushStatusHistory(order, mappedStatus, `Tự động cập nhật từ GHN (${ghnOrder?.status})`)
    if (mappedStatus === 'cancelled') {
      order.isCancelled = true
      order.cancelledAt = order.cancelledAt || new Date()
    }
    // SỬA: cùng loại lỗi vừa phát hiện ở nhánh 'cancelled' — trước đây khi
    // GHN tự báo "đã giao" qua auto-sync (không phải admin bấm tay), cờ
    // isDelivered không hề được set true dù status đã là 'delivered'.
    if (mappedStatus === 'delivered') {
      order.isDelivered = true
      order.deliveredAt = order.deliveredAt || new Date()
    }
    // ── MỚI: hoàn tồn kho khi GHN báo đơn đã hủy/hoàn về — đây là
    // đường dẫn thứ 3 (ngoài approveCancelOrder và updateOrderStatus)
    // trước đây bị bỏ sót, khiến đơn bị hủy TRÊN GHN rồi đồng bộ về
    // hệ thống nội bộ không hề hoàn kho.
    if (mappedStatus === 'cancelled' || mappedStatus === 'returned') {
      await restoreStockForOrder(order)
      await revertVoucherForOrder(order)
    }
    await order.save()
    await notifyCustomerOrderStatus(order, mappedStatus)
    await handleCodRestrictionOnStatusChange(order, mappedStatus)
    statusChanged = true
  }

  return {
    available: true,
    orderCode,
    trackingUrl: order.ghnTrackingUrl || `https://tracking.ghn.dev/?order_code=${orderCode}`,
    currentStatus: ghnOrder?.status || '',
    events,
    estimatedDelivery: order.shippingEtaDate || null,
    statusChanged,
  }
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

  if (!order.ghnOrderCode) {
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
    const result = await syncOrderStatusFromGHN(order)
    res.json(result)
  } catch (e) {
    console.error('❌ GHN track error:', e.message)
    res.status(500); throw new Error(`Không thể theo dõi đơn hàng: ${e.message}`)
  }
})

// MỚI: khóa đơn giản chống chạy chồng lệnh — nếu lần chạy trước (do số đơn
// quá nhiều, mỗi đơn lại gọi API GHN thật) chưa xong mà đã tới giờ chạy lần
// tiếp theo (mỗi 10 phút, xem server.js), sẽ BỎ QUA lần trigger mới thay vì
// chạy chồng lên — tránh gọi trùng GHN cho cùng 1 đơn và tránh 2 lần chạy
// cùng ghi đè trạng thái lộn xộn.
let isSyncingGHN = false

// MỚI: Tự động đồng bộ trạng thái cho TẤT CẢ đơn đang giao qua GHN, chạy định
// kỳ nền (xem lịch chạy trong server.js). Chỉ xử lý đơn:
//  - có ghnOrderCode (đã tạo vận đơn GHN thật)
//  - chưa huỷ, chưa giao xong (không cần theo dõi nữa)
// Xử lý theo LÔ song song (SYNC_BATCH_SIZE đơn/lô, có delay nhẹ giữa các lô)
// thay vì tuần tự từng đơn — giảm đáng kể tổng thời gian 1 chu kỳ khi số đơn
// tăng lên, mà vẫn không dồn dập toàn bộ request lên GHN cùng lúc. Lỗi ở 1
// đơn không làm dừng các đơn còn lại.
const SYNC_BATCH_SIZE = 5
const SYNC_BATCH_DELAY_MS = 500 // nghỉ giữa mỗi lô (không phải giữa mỗi đơn)

async function autoSyncPendingGHNOrders() {
  // ── Khóa chống chồng lệnh ─────────────────────────────────────────
  if (isSyncingGHN) {
    logger.info('[Auto-sync GHN] Lần chạy trước chưa xong — bỏ qua lần này.')
    return
  }
  isSyncingGHN = true

  try {
    // SỬA LỖI: điều kiện cũ chỉ kiểm tra 2 cờ boolean isCancelled/isDelivered —
    // nếu vì lý do gì đó status đã là 'cancelled'/'delivered'/'returned' nhưng
    // 2 cờ này chưa/không được cập nhật theo (dữ liệu cũ trước khi có field
    // status, hoặc bị lệch do sửa tay), đơn đó sẽ bị đồng bộ MÃI MÃI vì điều
    // kiện chưa từng nhìn vào status. Giờ kiểm tra CẢ status lẫn 2 cờ cũ —
    // chỉ cần 1 trong 2 nguồn báo "đã kết thúc" là dừng, không chờ cả 2 khớp.
    const pendingOrders = await Order.find({
      ghnOrderCode: { $ne: '' },
      isCancelled: { $ne: true },
      isDelivered: { $ne: true },
      $or: [
        { status: { $exists: false } },
        { status: { $nin: ['cancelled', 'delivered', 'returned'] } },
      ],
    })

    if (pendingOrders.length === 0) return

    logger.info(`[Auto-sync GHN] Đang kiểm tra ${pendingOrders.length} đơn hàng (lô ${SYNC_BATCH_SIZE} đơn/lần)...`)
    let updatedCount = 0

    // Chia thành các lô SYNC_BATCH_SIZE đơn, xử lý SONG SONG trong từng lô,
    // nghỉ SYNC_BATCH_DELAY_MS giữa các lô để không dồn dập GHN cùng lúc.
    for (let i = 0; i < pendingOrders.length; i += SYNC_BATCH_SIZE) {
      const batch = pendingOrders.slice(i, i + SYNC_BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map((order) => syncOrderStatusFromGHN(order))
      )

      results.forEach((result, idx) => {
        const order = batch[idx]
        if (result.status === 'fulfilled') {
          if (result.value?.statusChanged) {
            updatedCount++
            logger.info(`[Auto-sync GHN] Đơn #${order._id.toString().slice(-6)} → ${order.status}`)
          }
        } else {
          logger.error(`[Auto-sync GHN] Lỗi đơn #${order._id.toString().slice(-6)}: ${result.reason?.message}`)
        }
      })

      // Còn lô tiếp theo thì mới nghỉ (lô cuối không cần)
      if (i + SYNC_BATCH_SIZE < pendingOrders.length) {
        await new Promise((resolve) => setTimeout(resolve, SYNC_BATCH_DELAY_MS))
      }
    }

    if (updatedCount > 0) {
      logger.info(`[Auto-sync GHN] Hoàn tất — đã cập nhật ${updatedCount}/${pendingOrders.length} đơn.`)
    }
  } finally {
    // Luôn mở khóa dù có lỗi giữa chừng — nếu không, 1 lần lỗi sẽ khóa cứng
    // chức năng này mãi mãi cho tới khi restart server.
    isSyncingGHN = false
  }
}

// MỚI: bản GHTK của autoSyncPendingGHNOrders — cùng cấu trúc khóa chống
// chồng lệnh + xử lý theo lô song song, chỉ khác nguồn dữ liệu (ghtkLabelCode
// thay vì ghnOrderCode, gọi syncOrderStatusFromGHTK thay vì …FromGHN).
let isSyncingGHTK = false

async function autoSyncPendingGHTKOrders() {
  if (isSyncingGHTK) {
    logger.info('[Auto-sync GHTK] Lần chạy trước chưa xong — bỏ qua lần này.')
    return
  }
  isSyncingGHTK = true

  try {
    const pendingOrders = await Order.find({
      ghtkLabelCode: { $ne: '' },
      isCancelled: { $ne: true },
      isDelivered: { $ne: true },
      $or: [
        { status: { $exists: false } },
        { status: { $nin: ['cancelled', 'delivered', 'returned'] } },
      ],
    })

    if (pendingOrders.length === 0) return

    logger.info(`[Auto-sync GHTK] Đang kiểm tra ${pendingOrders.length} đơn hàng (lô ${SYNC_BATCH_SIZE} đơn/lần)...`)
    let updatedCount = 0

    for (let i = 0; i < pendingOrders.length; i += SYNC_BATCH_SIZE) {
      const batch = pendingOrders.slice(i, i + SYNC_BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map((order) => syncOrderStatusFromGHTK(order))
      )

      results.forEach((result, idx) => {
        const order = batch[idx]
        if (result.status === 'fulfilled') {
          if (result.value?.statusChanged) {
            updatedCount++
            logger.info(`[Auto-sync GHTK] Đơn #${order._id.toString().slice(-6)} → ${order.status}`)
          }
        } else {
          logger.error(`[Auto-sync GHTK] Lỗi đơn #${order._id.toString().slice(-6)}: ${result.reason?.message}`)
        }
      })

      if (i + SYNC_BATCH_SIZE < pendingOrders.length) {
        await new Promise((resolve) => setTimeout(resolve, SYNC_BATCH_DELAY_MS))
      }
    }

    if (updatedCount > 0) {
      logger.info(`[Auto-sync GHTK] Hoàn tất — đã cập nhật ${updatedCount}/${pendingOrders.length} đơn.`)
    }
  } finally {
    isSyncingGHTK = false
  }
}

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

// ── MỚI: hàm dùng chung hoàn tồn kho cho 1 đơn hàng — dùng ở cả
// approveCancelOrder (khách yêu cầu hủy được duyệt) VÀ updateOrderStatus
// (admin/GHN đẩy trạng thái sang 'cancelled' hoặc 'returned'). Có cờ
// order.stockRestored để đảm bảo CHỈ hoàn kho ĐÚNG 1 LẦN dù đơn có đi
// qua nhiều đường dẫn khác nhau tới cùng kết cục "không giao được".
const restoreStockForOrder = async (order) => {
  if (order.stockRestored) {
    console.log(`ℹ️ Đơn #${order._id} đã hoàn kho trước đó, bỏ qua.`)
    return
  }

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
    order.stockRestored = true
  } catch (e) {
    console.error('❌ Lỗi hoàn stock (non-fatal):', e.message)
  }
}

// ── MỚI: hàm dùng chung hoàn usedCount + gỡ usedBy của voucher cho 1 đơn
// — dùng ở approveCancelOrder, updateOrderStatus, syncOrderStatusFromGHN,
// deleteOrder. Có cờ order.voucherReverted để chỉ hoàn ĐÚNG 1 LẦN.
const revertVoucherForOrder = async (order) => {
  if (!order.voucherCode || order.voucherReverted) return
  try {
    await Voucher.findOneAndUpdate(
      { code: order.voucherCode, usedCount: { $gt: 0 } },
      {
        $inc: { usedCount: -1 },
        $pull: { usedBy: { user: order.user } },
      }
    )
    order.voucherReverted = true
    console.log(`✅ Hoàn usedCount voucher: ${order.voucherCode}`)
  } catch (e) {
    console.error('❌ Lỗi hoàn usedCount voucher (non-fatal):', e.message)
  }
}

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

  // ── Hoàn lại tồn kho theo màu khi Admin chấp thuận hủy ────
  await restoreStockForOrder(order)

  // ── Hoàn lại usedCount voucher khi Admin chấp thuận hủy ────────
  await revertVoucherForOrder(order)

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

// MỚI: xác thực webhook SePay bằng HMAC-SHA256, đúng theo tài liệu chính
// thức của SePay (developer.sepay.vn/en/sepay-webhooks/xac-thuc):
//   - Header 'X-SePay-Signature': dạng 'sha256={hex_hash}'
//   - Header 'X-SePay-Timestamp': Unix giây lúc SePay ký
//   - Chuỗi được ký: `${timestamp}.${raw_body}` (dùng byte thô, KHÔNG phải
//     req.body đã parse rồi JSON.stringify lại — 2 cái có thể lệch nhau do
//     thứ tự key/khoảng trắng khác bản gốc, khiến chữ ký luôn sai)
// Đồng thời chống replay: từ chối nếu timestamp lệch giờ server quá 5 phút.
function verifySepaySignature(req) {
  const secret = (process.env.SEPAY_SECRET || '').trim()
  if (!secret) {
    // Chưa cấu hình SEPAY_SECRET trên server — coi như CHƯA bật xác thực,
    // cho qua nhưng cảnh báo rõ trong log để không bị quên.
    logger.warn('[SePay Webhook] SEPAY_SECRET chưa được cấu hình — đang chạy KHÔNG xác thực chữ ký. Chỉ chấp nhận khi test nội bộ, KHÔNG dùng cho production.')
    return { ok: true, skipped: true }
  }

  const signatureHeader = req.headers['x-sepay-signature'] || ''
  const timestampHeader = req.headers['x-sepay-timestamp'] || ''

  if (!signatureHeader || !timestampHeader) {
    return { ok: false, reason: 'Thiếu header X-SePay-Signature hoặc X-SePay-Timestamp' }
  }

  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return { ok: false, reason: 'Timestamp không hợp lệ hoặc đã hết hạn (lệch quá 5 phút)' }
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : ''
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  const sigBuf = Buffer.from(String(signatureHeader))
  const expBuf = Buffer.from(expected)
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)

  return valid ? { ok: true, skipped: false } : { ok: false, reason: 'Chữ ký không khớp' }
}

const sepayWebhook = async (req, res) => {
  try {
    const verification = verifySepaySignature(req)
    if (!verification.ok) {
      logger.warn(`[SePay Webhook] Từ chối — ${verification.reason}`)
      return res.status(401).json({ success: false, message: 'Invalid signature' })
    }

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
  const { start, end, prevStart, prevEnd, label, prevLabel } = resolvePeriodRange(req.query)
  const { period = 'month' } = req.query

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

  // (order sẽ bị xóa ngay sau đây nên không cần order.save() cho cờ voucherReverted)
  await revertVoucherForOrder(order)

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
  autoSyncPendingGHNOrders,
  autoSyncPendingGHTKOrders,
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