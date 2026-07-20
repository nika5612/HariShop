import Order from '../models/orderModel.js'
import { getCurrentOrderStatus } from '../config/orderStatusConfig.js'

// ══════════════════════════════════════════════════════════════════
// MỚI: gom TOÀN BỘ logic tính toán số liệu báo cáo doanh thu vào 1 nơi
// duy nhất — dùng chung cho exportOrdersExcel VÀ exportRevenuePdf, để
// 2 định dạng xuất ra luôn khớp số liệu tuyệt đối với nhau (và khớp với
// trang Dashboard doanh thu trên web). KHÔNG thay đổi bất kỳ công thức
// tính toán nào đã có — chỉ tập hợp lại cho gọn và tái sử dụng.
// ══════════════════════════════════════════════════════════════════

const DELIVERED_MATCH = {
  $or: [
    { status: 'delivered' },
    { status: { $exists: false }, isDelivered: true },
  ],
}

// granularity: 'day' | 'month' | 'year' — chọn theo độ dài khoảng thời gian
// (bám sát yêu cầu "theo ngày / theo tháng nếu xem theo năm / theo năm nếu xem toàn bộ")
const pickGranularity = (start, end) => {
  const days = (end.getTime() - start.getTime()) / 86400000
  if (days > 731) return 'year'
  if (days > 62) return 'month'
  return 'day'
}

const dateFormatByGranularity = {
  day: '%Y-%m-%d',
  month: '%Y-%m',
  year: '%Y',
}

const labelByGranularity = (key, granularity) => {
  if (granularity === 'day') {
    const [, m, d] = key.split('-')
    return `${d}/${m}`
  }
  if (granularity === 'month') {
    const [y, m] = key.split('-')
    return `Th ${Number(m)}/${y}`
  }
  return key // year
}

// ── Trạng thái đơn: màu + nhãn ĐẦY ĐỦ (dùng cho Pie Chart, đủ chỗ hiển thị) ──
export const STATUS_COLOR = {
  delivered: '#22e3b6', cancelled: '#ff6b6b', pending: '#5eb3f6', confirmed: '#5eb3f6',
  packing: '#ffd166', waiting_pickup: '#ffd166', picked_up: '#ffd166', in_transit: '#ffd166',
  out_for_delivery: '#ffd166', delivery_failed: '#ff6b6b', returning: '#ff6b6b', returned: '#ff6b6b',
}
export const STATUS_LABEL_VI = {
  delivered: 'Giao thành công', cancelled: 'Đã hủy', pending: 'Đã đặt hàng', confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói', waiting_pickup: 'Chờ lấy hàng', picked_up: 'Đã lấy hàng',
  in_transit: 'Đang vận chuyển', out_for_delivery: 'Đang giao hàng', delivery_failed: 'Giao thất bại',
  returning: 'Đang hoàn về', returned: 'Đã hoàn về',
}
// MỚI: nhãn NGẮN — dùng riêng cho cột "Trạng thái" hẹp trong bảng danh sách
// đơn hàng (PDF) để không bị wrap xuống dòng gây đè chữ lên hàng dưới.
export const STATUS_LABEL_SHORT = {
  delivered: 'Thành công', cancelled: 'Đã hủy', pending: 'Đã đặt', confirmed: 'Xác nhận',
  packing: 'Đóng gói', waiting_pickup: 'Chờ lấy', picked_up: 'Đã lấy',
  in_transit: 'Vận chuyển', out_for_delivery: 'Đang giao', delivery_failed: 'Thất bại',
  returning: 'Hoàn về', returned: 'Đã hoàn',
}

// ── MỚI: gom 12 trạng thái chi tiết thành 3 NHÓM LỚN — dùng riêng cho
// Pie Chart "Trạng thái đơn hàng" (giống Haravan/KiotViet). Trước đây Pie
// Chart hiển thị nguyên 12 trạng thái chi tiết, nhiều trạng thái phải dùng
// CHUNG 1 màu (không đủ màu phân biệt) khiến biểu đồ khó đọc — bảng danh
// sách đơn hàng vẫn giữ nguyên 12 trạng thái chi tiết, KHÔNG bị ảnh hưởng.
const STATUS_GROUP = {
  delivered: 'success',
  pending: 'processing', confirmed: 'processing', packing: 'processing',
  waiting_pickup: 'processing', picked_up: 'processing', in_transit: 'processing',
  out_for_delivery: 'processing',
  cancelled: 'failed', delivery_failed: 'failed', returning: 'failed', returned: 'failed',
}
const GROUP_LABEL = { success: 'Thành công', processing: 'Đang xử lý', failed: 'Hủy / Thất bại' }
const GROUP_COLOR = { success: '#22e3b6', processing: '#5eb3f6', failed: '#ff6b6b' }
// Thứ tự cố định khi hiển thị (thay vì sort theo số lượng) — giữ đúng thứ tự
// nghiệp vụ Thành công → Đang xử lý → Hủy/Thất bại, dễ đọc và nhất quán giữa
// các lần xuất báo cáo khác nhau.
const GROUP_ORDER = ['success', 'processing', 'failed']

// MỚI: tách riêng thành hàm THUẦN TÚY (chỉ nhận mảng key trạng thái, không
// đụng tới DB hay document Order) — để viết test tự động (Jest) độc lập,
// không cần mock Mongoose. getReportData bên dưới chỉ gọi lại hàm này.
export const groupStatusBreakdown = (statusKeys) => {
  const groupCount = { success: 0, processing: 0, failed: 0 }
  statusKeys.forEach((key) => {
    const group = STATUS_GROUP[key] || 'processing'
    groupCount[group] += 1
  })
  return GROUP_ORDER
    .filter((group) => groupCount[group] > 0)
    .map((group) => ({ label: GROUP_LABEL[group], value: groupCount[group], color: GROUP_COLOR[group] }))
}

export const getReportData = async ({ start, end, prevStart, prevEnd }) => {
  const granularity = pickGranularity(start, end)

  // ── Doanh thu theo thời gian (ngày/tháng/năm tùy độ dài kỳ) ──────
  const revenueSeriesAgg = await Order.aggregate([
    { $match: { ...DELIVERED_MATCH, deliveredAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormatByGranularity[granularity], date: '$deliveredAt' } },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ])
  const revenueSeries = revenueSeriesAgg.map((r) => ({
    key: r._id,
    label: labelByGranularity(r._id, granularity),
    value: r.revenue,
  }))

  // ── KPI tổng quan ─────────────────────────────────────────────────
  const [currentAgg] = await Order.aggregate([
    { $match: { ...DELIVERED_MATCH, deliveredAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
  ])
  const totalRevenue = currentAgg?.total || 0

  const ordersInPeriod = await Order.find({ createdAt: { $gte: start, $lte: end } })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  const totalOrders = ordersInPeriod.length
  const successOrders = ordersInPeriod.filter((o) => getCurrentOrderStatus(o) === 'delivered')
  const cancelledOrders = ordersInPeriod.filter((o) => getCurrentOrderStatus(o) === 'cancelled')
  const successRate = totalOrders > 0 ? Math.round((successOrders.length / totalOrders) * 1000) / 10 : 0
  const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders.length / totalOrders) * 1000) / 10 : 0

  // ── Tăng trưởng so với kỳ trước (chỉ tính khi có prevStart/prevEnd) ──
  let growthPct = null
  if (prevStart && prevEnd) {
    const [prevAgg] = await Order.aggregate([
      { $match: { ...DELIVERED_MATCH, deliveredAt: { $gte: prevStart, $lte: prevEnd } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ])
    const prevRevenue = prevAgg?.total || 0
    if (prevRevenue > 0) {
      growthPct = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
    }
  }

  // ── Phân bố trạng thái đơn (Pie Chart) — gom theo 3 NHÓM LỚN ───────
  const statusBreakdown = groupStatusBreakdown(ordersInPeriod.map((o) => getCurrentOrderStatus(o)))

  // ── Phân bố phương thức thanh toán (COD / Online) ─────────────────
  const codCount = ordersInPeriod.filter((o) => o.paymentMethod === 'cod').length
  const onlineCount = totalOrders - codCount
  const paymentBreakdown = [
    { label: 'COD', value: codCount, color: '#22e3b6' },
    { label: 'Online (Chuyển khoản/QR)', value: onlineCount, color: '#1b1b32' },
  ].filter((p) => p.value > 0)

  // ── Top 5 sản phẩm bán chạy (tính trên đơn Giao thành công) ───────
  const productMap = new Map()
  successOrders.forEach((o) => {
    (o.orderItems || []).forEach((it) => {
      const pid = it.product ? String(it.product) : it.name
      const existing = productMap.get(pid) || { name: it.name, qty: 0, revenue: 0 }
      existing.qty += Number(it.qty) || 0
      existing.revenue += (Number(it.price) || 0) * (Number(it.qty) || 0)
      productMap.set(pid, existing)
    })
  })
  const totalProductRevenue = [...productMap.values()].reduce((s, p) => s + p.revenue, 0) || 1
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({ ...p, share: Math.round((p.revenue / totalProductRevenue) * 1000) / 10 }))

  // ── Top khách hàng theo doanh thu (tính trên đơn Giao thành công) ─
  const customerMap = new Map()
  successOrders.forEach((o) => {
    const uid = o.user?._id ? String(o.user._id) : (o.user ? String(o.user) : 'guest')
    const existing = customerMap.get(uid) || {
      name: o.user?.name || '(đã xóa)', email: o.user?.email || '', orderCount: 0, totalSpent: 0,
    }
    existing.orderCount += 1
    existing.totalSpent += o.totalPrice || 0
    customerMap.set(uid, existing)
  })
  const topCustomers = [...customerMap.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)

  return {
    granularity,
    revenueSeries,
    kpis: {
      totalRevenue,
      totalOrders,
      successCount: successOrders.length,
      cancelledCount: cancelledOrders.length,
      successRate,
      cancelRate,
    },
    growthPct,
    statusBreakdown,
    paymentBreakdown,
    topProducts,
    topCustomers,
    ordersInPeriod, // dùng cho bảng danh sách đơn hàng (Excel sheet 2 / PDF trang cuối)
  }
}