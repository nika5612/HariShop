import asyncHandler from 'express-async-handler'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import path from 'path'
import { fileURLToPath } from 'url'
import { getOrderStatusInfo, getCurrentOrderStatus } from '../config/orderStatusConfig.js'
import { resolvePeriodRange } from '../utils/reportPeriod.js'
import { getReportData, STATUS_LABEL_SHORT, STATUS_COLOR } from '../utils/reportData.js'
import { renderBarChartPng, renderPieChartPng } from '../utils/chartRenderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FONT_REGULAR = path.join(__dirname, '../assets/fonts/BeVietnamPro-Regular.ttf')
const FONT_BOLD = path.join(__dirname, '../assets/fonts/BeVietnamPro-Bold.ttf')
const FONT_SEMIBOLD = path.join(__dirname, '../assets/fonts/BeVietnamPro-SemiBold.ttf')

const BRAND = { primary: 'FF22E3B6', dark: 'FF1B1B32', white: 'FFFFFFFF', lightBg: 'FFF5F7FA' }
const MONEY_FMT = '#,##0"đ"'
const DATE_FMT = 'dd/mm/yyyy hh:mm'

const paymentLabelOf = (o) => {
  if (o.refundStatus === 'completed') return { label: 'Đã hoàn tiền', color: 'FF8A8FA3' }
  if (o.refundStatus === 'requested') return { label: 'Yêu cầu hoàn tiền', color: 'FFFFD166' }
  if (o.refundStatus === 'rejected') return { label: 'Từ chối hoàn tiền', color: 'FFFF6B6B' }
  if (o.isPaid) return { label: 'Đã thanh toán', color: 'FF22E3B6' }
  return { label: 'Chưa thanh toán', color: 'FFFF6B6B' }
}

const styleHeaderRow = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.white }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.dark } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
  })
  row.height = 24
}

const borderThin = { style: 'thin', color: { argb: 'FFE2E2EA' } }
const applyRowBorderAndBanding = (row, rowIndexInTable) => {
  row.eachCell((cell) => {
    cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }
  })
  if (rowIndexInTable % 2 === 1) {
    row.eachCell((cell) => {
      if (!cell.fill || !cell.fill.fgColor) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.lightBg } }
      }
    })
  }
}


export const buildExcelWorkbook = async (reportData, meta) => {
  const { kpis, revenueSeries, statusBreakdown, paymentBreakdown, topProducts, topCustomers, ordersInPeriod, growthPct } = reportData
  const { label, exportedBy, generatedAt, statusFilter } = meta

  const workbook = new ExcelJS.Workbook()
  workbook.creator = exportedBy || 'HariShop Admin'
  workbook.created = generatedAt

  // ── SHEET 1: DASHBOARD ──────────────────────────────────────────
  const dash = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] })
  dash.columns = Array.from({ length: 10 }, () => ({ width: 13 }))

  dash.mergeCells('A1:J1')
  dash.getCell('A1').value = 'HARI SHOP'
  dash.getCell('A1').font = { bold: true, size: 14, color: { argb: BRAND.dark } }
  dash.getCell('A1').alignment = { horizontal: 'center' }

  dash.mergeCells('A2:J2')
  dash.getCell('A2').value = 'BÁO CÁO DOANH THU'
  dash.getCell('A2').font = { bold: true, size: 24, color: { argb: BRAND.dark } }
  dash.getCell('A2').alignment = { horizontal: 'center' }

  dash.mergeCells('A3:J3')
  dash.getCell('A3').value = `Khoảng thời gian: ${label}`
  dash.getCell('A3').font = { size: 12, color: { argb: 'FF555555' } }
  dash.getCell('A3').alignment = { horizontal: 'center' }

  dash.mergeCells('A4:J4')
  dash.getCell('A4').value = `Ngày xuất: ${generatedAt.toLocaleString('vi-VN')}   |   Người xuất: ${exportedBy || 'Admin'}`
  dash.getCell('A4').font = { size: 10.5, italic: true, color: { argb: 'FF888888' } }
  dash.getCell('A4').alignment = { horizontal: 'center' }

  // KPI cards — 5 thẻ, mỗi thẻ rộng 2 cột, cao 4 dòng
  const kpiCards = [
    { icon: '💰', label: 'Tổng doanh thu', value: `${kpis.totalRevenue.toLocaleString('vi-VN')}đ`, color: BRAND.primary },
    { icon: '📦', label: 'Tổng số đơn', value: String(kpis.totalOrders), color: 'FF5EB3F6' },
    { icon: '✅', label: 'Giao thành công', value: String(kpis.successCount), color: 'FF22E3B6' },
    { icon: '❌', label: 'Đơn hủy', value: String(kpis.cancelledCount), color: 'FFFF6B6B' },
    { icon: '📈', label: 'Tỷ lệ thành công', value: `${kpis.successRate}%`, color: 'FFFFD166' },
  ]
  const cardStartRow = 6
  const cardHeight = 4
  kpiCards.forEach((card, i) => {
    const colStart = i * 2 + 1
    const colEnd = colStart + 1
    const colStartLetter = String.fromCharCode(64 + colStart)
    const colEndLetter = String.fromCharCode(64 + colEnd)
    dash.mergeCells(`${colStartLetter}${cardStartRow}:${colEndLetter}${cardStartRow + cardHeight - 1}`)
    const cell = dash.getCell(`${colStartLetter}${cardStartRow}`)
    cell.value = `${card.icon}\n${card.value}\n${card.label}`
    cell.font = { bold: true, size: 13, color: { argb: BRAND.white } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.color } }
  })
  for (let r = cardStartRow; r < cardStartRow + cardHeight; r++) dash.getRow(r).height = 22

  let cursorRow = cardStartRow + cardHeight + 2

  // Tỷ lệ hủy đơn + so sánh kỳ trước (dòng phụ, không phải card lớn)
  dash.mergeCells(`A${cursorRow}:J${cursorRow}`)
  const growthText = growthPct === null ? '' : (growthPct >= 0
    ? `  |  Tăng trưởng so với kỳ trước: +${growthPct}% 📈`
    : `  |  Giảm so với kỳ trước: ${growthPct}% 📉`)
  dash.getCell(`A${cursorRow}`).value = `Tỷ lệ hủy đơn: ${kpis.cancelRate}%${growthText}`
  dash.getCell(`A${cursorRow}`).font = { size: 11.5, color: { argb: 'FF444444' } }
  dash.getCell(`A${cursorRow}`).alignment = { horizontal: 'center' }
  cursorRow += 2

  // Biểu đồ doanh thu theo thời gian — tiêu đề nhúng trong ảnh (căn giữa chuẩn)
  const revenueChartTitle = `Doanh thu theo ${reportData.granularity === 'day' ? 'ngày' : reportData.granularity === 'month' ? 'tháng' : 'năm'}`

  if (revenueSeries.length > 0) {
    const bar = await renderBarChartPng({
      data: revenueSeries.map((d) => ({ label: d.label, value: d.value })),
      title: revenueChartTitle,
    })
    const barImgId = workbook.addImage({ buffer: bar.buffer, extension: 'png' })
    dash.addImage(barImgId, { tl: { col: 0, row: cursorRow - 1 }, ext: { width: bar.width, height: bar.height } })
    cursorRow += 20
  } else {
    dash.getCell(`A${cursorRow}`).value = `${revenueChartTitle} — Không có dữ liệu doanh thu trong khoảng thời gian này.`
    dash.getCell(`A${cursorRow}`).font = { bold: true, size: 13, color: { argb: BRAND.dark } }
    cursorRow += 2
  }

  const DEFAULT_ROW_PX = 20
  if (statusBreakdown.length > 0) {
    const statusPie = await renderPieChartPng({ data: statusBreakdown, title: 'Trạng thái đơn hàng' })
    const statusPieId = workbook.addImage({ buffer: statusPie.buffer, extension: 'png' })
    dash.addImage(statusPieId, { tl: { col: 0, row: cursorRow - 1 }, ext: { width: statusPie.width, height: statusPie.height } })
    cursorRow += Math.ceil(statusPie.height / DEFAULT_ROW_PX) + 2
  }
  if (paymentBreakdown.length > 0) {
    const paymentPie = await renderPieChartPng({ data: paymentBreakdown, title: 'Phương thức thanh toán' })
    const paymentPieId = workbook.addImage({ buffer: paymentPie.buffer, extension: 'png' })
    dash.addImage(paymentPieId, { tl: { col: 0, row: cursorRow - 1 }, ext: { width: paymentPie.width, height: paymentPie.height } })
    cursorRow += Math.ceil(paymentPie.height / DEFAULT_ROW_PX) + 2
  }

  // ── SHEET 2: ĐƠN HÀNG ────────────────────────────────────────────
  const orderSheet = workbook.addWorksheet('Đơn hàng')
  const filteredOrders = statusFilter ? ordersInPeriod.filter((o) => getCurrentOrderStatus(o) === statusFilter) : ordersInPeriod

  orderSheet.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Mã đơn', key: 'orderId', width: 26 },
    { header: 'Khách hàng', key: 'customerName', width: 22 },
    { header: 'Email', key: 'customerEmail', width: 26 },
    { header: 'Ngày đặt', key: 'createdAt', width: 18 },
    { header: 'Trạng thái', key: 'status', width: 20 },
    { header: 'Thanh toán', key: 'paymentStatus', width: 18 },
    { header: 'Phương thức', key: 'paymentMethod', width: 14 },
    { header: 'Tạm tính', key: 'itemsPrice', width: 15 },
    { header: 'Giảm giá', key: 'discount', width: 15 },
    { header: 'Phí ship', key: 'shippingFee', width: 12 },
    { header: 'Tổng tiền', key: 'totalPrice', width: 16 },
  ]
  styleHeaderRow(orderSheet.getRow(1))
  orderSheet.views = [{ state: 'frozen', ySplit: 1 }]
  orderSheet.autoFilter = { from: 'A1', to: 'L1' }

  filteredOrders.forEach((o, idx) => {
    const statusInfo = getOrderStatusInfo(o)
    const payInfo = paymentLabelOf(o)

    const row = orderSheet.addRow({
      stt: idx + 1,
      orderId: String(o._id),
      customerName: o.user?.name || '(đã xóa)',
      customerEmail: o.user?.email || '',
      createdAt: o.createdAt,
      status: statusInfo.label,
      paymentStatus: payInfo.label,
      paymentMethod: o.paymentMethod === 'cod' ? 'COD' : 'Online',
      itemsPrice: o.itemsPrice || 0,
      discount: o.voucherDiscount || 0,
      shippingFee: o.deliveryFee || o.shippingPrice || 0,
      totalPrice: o.totalPrice || 0,
    })

    row.getCell('createdAt').numFmt = DATE_FMT
    ;['itemsPrice', 'discount', 'shippingFee', 'totalPrice'].forEach((key) => {
      row.getCell(key).numFmt = MONEY_FMT
    })

    applyRowBorderAndBanding(row, idx)
    row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusInfo.color.replace('#', 'FF') } }
    row.getCell('status').font = { color: { argb: BRAND.white }, bold: true }
    row.getCell('paymentStatus').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: payInfo.color } }
    row.getCell('paymentStatus').font = { color: { argb: BRAND.white }, bold: true }
  })

  orderSheet.addRow({})
  const successfulOrders = filteredOrders.filter((o) => getCurrentOrderStatus(o) === 'delivered')
  const successfulRevenue = successfulOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  const countRow = orderSheet.addRow({ customerName: `Tổng số đơn trong danh sách: ${filteredOrders.length}` })
  countRow.font = { italic: true, color: { argb: 'FF888888' } }
  const totalRow = orderSheet.addRow({
    customerName: `Tổng doanh thu (chỉ tính ${successfulOrders.length} đơn Giao thành công)`,
    totalPrice: successfulRevenue,
  })
  totalRow.font = { bold: true }
  totalRow.getCell('totalPrice').numFmt = MONEY_FMT
  orderSheet.addRow({ customerName: `Ngày xuất báo cáo: ${generatedAt.toLocaleString('vi-VN')} — Người xuất: ${exportedBy || 'Admin'}` })
    .font = { italic: true, size: 9, color: { argb: 'FF999999' } }

  // ── SHEET 3: TOP SẢN PHẨM ────────────────────────────────────────
  const prodSheet = workbook.addWorksheet('Top sản phẩm')
  prodSheet.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Tên sản phẩm', key: 'name', width: 40 },
    { header: 'Số lượng bán', key: 'qty', width: 16 },
    { header: 'Doanh thu', key: 'revenue', width: 18 },
    { header: 'Tỷ trọng doanh thu', key: 'share', width: 18 },
  ]
  styleHeaderRow(prodSheet.getRow(1))
  topProducts.forEach((p, idx) => {
    const row = prodSheet.addRow({ stt: idx + 1, name: p.name, qty: p.qty, revenue: p.revenue, share: `${p.share}%` })
    row.getCell('revenue').numFmt = MONEY_FMT
    applyRowBorderAndBanding(row, idx)
  })
  if (topProducts.length === 0) prodSheet.addRow({ name: 'Chưa có dữ liệu trong khoảng thời gian này.' })

  // ── SHEET 4: TOP KHÁCH HÀNG ──────────────────────────────────────
  const custSheet = workbook.addWorksheet('Top khách hàng')
  custSheet.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Tên khách hàng', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Số đơn', key: 'orderCount', width: 12 },
    { header: 'Tổng tiền', key: 'totalSpent', width: 18 },
  ]
  styleHeaderRow(custSheet.getRow(1))
  topCustomers.forEach((c, idx) => {
    const row = custSheet.addRow({ stt: idx + 1, name: c.name, email: c.email, orderCount: c.orderCount, totalSpent: c.totalSpent })
    row.getCell('totalSpent').numFmt = MONEY_FMT
    applyRowBorderAndBanding(row, idx)
  })
  if (topCustomers.length === 0) custSheet.addRow({ name: 'Chưa có dữ liệu trong khoảng thời gian này.' })

  return workbook
}

// ══════════════════════════════════════════════════════════════════
// PDF — xây dựng báo cáo nhiều trang từ reportData (không phụ thuộc DB)
// ══════════════════════════════════════════════════════════════════
export const buildPdfReport = async (reportData, meta, res) => {
  const { kpis, revenueSeries, statusBreakdown, topProducts, topCustomers, ordersInPeriod, growthPct, prevLabel } = reportData
  const { label, exportedBy, generatedAt } = meta

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  doc.registerFont('VN', FONT_REGULAR)
  doc.registerFont('VN-Bold', FONT_BOLD)
  doc.registerFont('VN-Semi', FONT_SEMIBOLD)

  const PAGE_W = doc.page.width
  const PAGE_H = doc.page.height
  const C = { primary: '#22e3b6', dark: '#1b1b32', white: '#ffffff', gray: '#8a8fa3', red: '#ff6b6b' }

  const filename = `bao-cao-doanh-thu_${label.replace(/[/\s→]/g, '-')}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  doc.pipe(res)

  // ── TRANG BÌA ──────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.dark)
  doc.fillColor(C.primary).font('VN-Bold').fontSize(20).text('HARI SHOP', 0, 220, { align: 'center' })
  doc.fillColor(C.white).font('VN-Bold').fontSize(34).text('BÁO CÁO DOANH THU', 0, 260, { align: 'center' })
  doc.font('VN').fontSize(14).fillColor(C.gray).text(label, 0, 320, { align: 'center' })
  doc.fontSize(10).text(`Ngày xuất: ${generatedAt.toLocaleString('vi-VN')}`, 0, PAGE_H - 90, { align: 'center' })
  doc.text(`Người xuất: ${exportedBy || 'Admin'}`, 0, PAGE_H - 74, { align: 'center' })

  // ── TRANG: TÓM TẮT ĐIỀU HÀNH (Executive Summary) ──────────────
  doc.addPage()
  doc.fillColor(C.dark).font('VN-Bold').fontSize(18).text(`TÓM TẮT BÁO CÁO ${label.toUpperCase()}`, { align: 'left' })
  doc.moveDown(1)
  doc.font('VN').fontSize(11.5).fillColor('#333')
  const bullets = [
    `Tổng doanh thu đạt ${kpis.totalRevenue.toLocaleString('vi-VN')}đ.`,
    `Có ${kpis.totalOrders} đơn hàng, trong đó ${kpis.successCount} đơn giao thành công (${kpis.successRate}%).`,
    `Tỷ lệ hủy đơn là ${kpis.cancelRate}%${kpis.cancelRate > 30 ? ', cần xem xét để cải thiện quy trình xử lý đơn.' : '.'}`,
  ]
  if (topProducts.length > 0) {
    bullets.push(`Sản phẩm bán chạy nhất là ${topProducts[0].name}, đóng góp ${topProducts[0].revenue.toLocaleString('vi-VN')}đ doanh thu.`)
  }
  if (growthPct !== null) {
    bullets.push(
      growthPct >= 0
        ? `Doanh thu kỳ này tăng ${growthPct}% so với ${prevLabel}.`
        : `Doanh thu kỳ này giảm ${Math.abs(growthPct)}% so với ${prevLabel}.`
    )
  }
  bullets.forEach((b) => {
    doc.circle(44, doc.y + 5, 2).fill(C.primary)
    doc.fillColor('#333').text(b, 56, doc.y - 2, { width: PAGE_W - 96 })
    doc.moveDown(0.5)
  })

  // ── TRANG: KPI DASHBOARD (dạng Card) ───────────────────────────
  doc.addPage()
  doc.fillColor(C.dark).font('VN-Bold').fontSize(16).text('THỐNG KÊ TỔNG QUAN')
  doc.moveDown(1)

  const cards = [
    { icon: '$', label: 'Tổng doanh thu', value: `${kpis.totalRevenue.toLocaleString('vi-VN')}đ`, color: C.primary },
    { icon: '#', label: 'Tổng số đơn', value: String(kpis.totalOrders), color: '#5eb3f6' },
    { icon: '✓', label: 'Giao thành công', value: String(kpis.successCount), color: C.primary },
    { icon: '✗', label: 'Đơn hủy', value: String(kpis.cancelledCount), color: C.red },
    { icon: '▲', label: 'Tỷ lệ thành công', value: `${kpis.successRate}%`, color: '#ffd166' },
    { icon: '▼', label: 'Tỷ lệ hủy đơn', value: `${kpis.cancelRate}%`, color: C.red },
  ]
  const cardW = (PAGE_W - 80 - 20) / 2
  const cardH = 80
  const startY = doc.y
  cards.forEach((card, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 40 + col * (cardW + 20)
    const y = startY + row * (cardH + 16)
    doc.roundedRect(x, y, cardW, cardH, 8).fill(card.color)
    doc.fillColor(C.white).font('VN').fontSize(20).text(card.icon, x + 16, y + 14)
    doc.font('VN-Bold').fontSize(20).text(card.value, x + 16, y + 40)
    doc.font('VN').fontSize(10.5).text(card.label, x + 16, y + 62)
  })

  // ── TRANG: BIỂU ĐỒ DOANH THU ────────────────────────────────────
  doc.addPage()
  if (growthPct !== null) {
    doc.font('VN').fontSize(11).fillColor(growthPct >= 0 ? C.primary : C.red)
      .text(
        growthPct >= 0
          ? `▲ Tăng ${growthPct}% so với ${prevLabel}`
          : `▼ Giảm ${Math.abs(growthPct)}% so với ${prevLabel}`,
        { align: 'center' }
      )
  }
  doc.moveDown(0.5)
  if (revenueSeries.length > 0) {
    const chartW = PAGE_W - 80
    const bar = await renderBarChartPng({
      data: revenueSeries.map((d) => ({ label: d.label, value: d.value })),
      width: Math.round(chartW),
      height: Math.round(chartW * (380 / 900)),
      title: 'Doanh thu theo thời gian',
    })
    doc.image(bar.buffer, 40, doc.y, { width: chartW })
  } else {
    doc.font('VN-Bold').fontSize(16).fillColor(C.dark).text('DOANH THU THEO THỜI GIAN', { align: 'center' })
    doc.moveDown(0.5)
    doc.font('VN').fontSize(11).fillColor('#666').text('Không có dữ liệu doanh thu trong khoảng thời gian này.', { align: 'center' })
  }

  // ── TRANG: TOP SẢN PHẨM / TOP KHÁCH HÀNG / TRẠNG THÁI ĐƠN ──────
  doc.addPage()
  doc.fillColor(C.dark).font('VN-Bold').fontSize(15).text('TOP 5 SẢN PHẨM BÁN CHẠY')
  doc.moveDown(0.4)
  {
    let ty = doc.y
    doc.font('VN-Bold').fontSize(9.5)
    doc.text('STT', 40, ty, { width: 30 })
    doc.text('Sản phẩm', 70, ty, { width: 250 })
    doc.text('SL bán', 320, ty, { width: 60, align: 'right' })
    doc.text('Doanh thu', 390, ty, { width: 90, align: 'right' })
    doc.text('Tỷ trọng', 490, ty, { width: 60, align: 'right' })
    ty += 16
    doc.moveTo(40, ty).lineTo(555, ty).strokeColor('#dddddd').stroke()
    ty += 6
    doc.font('VN').fontSize(9.5)
    topProducts.forEach((p, i) => {
      doc.text(String(i + 1), 40, ty, { width: 30 })
      doc.text(p.name, 70, ty, { width: 250 })
      doc.text(String(p.qty), 320, ty, { width: 60, align: 'right' })
      doc.text(`${p.revenue.toLocaleString('vi-VN')}đ`, 390, ty, { width: 90, align: 'right' })
      doc.text(`${p.share}%`, 490, ty, { width: 60, align: 'right' })
      ty += 16
    })
    if (topProducts.length === 0) { doc.text('Chưa có dữ liệu.', 40, ty); ty += 16 }
    doc.y = ty + 14
  }

  doc.font('VN-Bold').fontSize(15).fillColor(C.dark).text('TOP KHÁCH HÀNG')
  doc.moveDown(0.4)
  {
    let ty = doc.y
    doc.font('VN-Bold').fontSize(9.5)
    doc.text('STT', 40, ty, { width: 30 })
    doc.text('Khách hàng', 70, ty, { width: 220 })
    doc.text('Số đơn', 300, ty, { width: 60, align: 'right' })
    doc.text('Tổng tiền', 390, ty, { width: 120, align: 'right' })
    ty += 16
    doc.moveTo(40, ty).lineTo(555, ty).strokeColor('#dddddd').stroke()
    ty += 6
    doc.font('VN').fontSize(9.5)
    topCustomers.forEach((c, i) => {
      doc.text(String(i + 1), 40, ty, { width: 30 })
      doc.text(c.name, 70, ty, { width: 220 })
      doc.text(String(c.orderCount), 300, ty, { width: 60, align: 'right' })
      doc.text(`${c.totalSpent.toLocaleString('vi-VN')}đ`, 390, ty, { width: 120, align: 'right' })
      ty += 16
    })
    if (topCustomers.length === 0) { doc.text('Chưa có dữ liệu.', 40, ty); ty += 16 }
    doc.y = ty + 14
  }

  if (statusBreakdown.length > 0) {
    const pie = await renderPieChartPng({ data: statusBreakdown, height: 260, title: 'Trạng thái đơn hàng' })
    const displayW = 400
    const displayH = displayW * (pie.height / pie.width)
    doc.image(pie.buffer, 40, doc.y, { width: displayW, height: displayH })
  }

  // ── TRANG CUỐI: DANH SÁCH ĐƠN HÀNG (tự sang trang khi dài) ──────
  doc.addPage()
  doc.fillColor(C.dark).font('VN-Bold').fontSize(15).text('DANH SÁCH ĐƠN HÀNG')
  doc.moveDown(0.5)

  const cols = [
    { key: 'stt', label: 'STT', x: 40, w: 20, align: 'left' },
    { key: 'orderId', label: 'Mã đơn', x: 62, w: 55, align: 'left' },
    { key: 'customerName', label: 'Khách hàng', x: 120, w: 85, align: 'left' },
    { key: 'createdAt', label: 'Ngày đặt', x: 208, w: 55, align: 'left' },
    { key: 'status', label: 'Trạng thái', x: 266, w: 105, align: 'left' },
    { key: 'paymentMethod', label: 'PT', x: 374, w: 30, align: 'left' },
    { key: 'totalPrice', label: 'Doanh thu', x: 407, w: 100, align: 'right' },
  ]

  const drawTableHeader = () => {
    const ty = doc.y
    doc.font('VN-Bold').fontSize(8.5).fillColor(C.white)
    doc.rect(40, ty - 3, 515, 16).fill(C.dark)
    doc.fillColor(C.white)
    cols.forEach((c) => doc.text(c.label, c.x, ty, { width: c.w, align: c.align }))
    doc.y = ty + 16
    doc.fillColor('#333')
  }

  drawTableHeader()
  doc.font('VN').fontSize(8.5)
  ordersInPeriod.forEach((o, idx) => {
    if (doc.y > PAGE_H - 60) {
      doc.addPage()
      drawTableHeader()
      doc.font('VN').fontSize(8.5)
    }
   
    const statusKey = getCurrentOrderStatus(o)
    const statusLabel = STATUS_LABEL_SHORT[statusKey] || getOrderStatusInfo(o).label
    const statusColor = STATUS_COLOR[statusKey] || '#8a8fa3'
    const ty = doc.y
    if (idx % 2 === 1) doc.rect(40, ty - 2, 515, 14).fill('#f5f7fa').fillColor('#333')
    doc.fillColor('#333')
    doc.text(String(idx + 1), 40, ty, { width: 20, lineBreak: false })
    doc.text(String(o._id).slice(-8), 62, ty, { width: 55, lineBreak: false })
    doc.text(o.user?.name || '(đã xóa)', 120, ty, { width: 85, lineBreak: false, ellipsis: true })
    doc.text(new Date(o.createdAt).toLocaleDateString('vi-VN'), 208, ty, { width: 55, lineBreak: false })
    doc.fillColor(statusColor).text(statusLabel, 266, ty, { width: 105, lineBreak: false })
    doc.fillColor('#333').text(o.paymentMethod === 'cod' ? 'COD' : 'Online', 374, ty, { width: 30, lineBreak: false })
    doc.text(`${(o.totalPrice || 0).toLocaleString('vi-VN')}đ`, 407, ty, { width: 100, align: 'right', lineBreak: false })
    doc.y = ty + 14
  })

  const range = doc.bufferedPageRange()
  const totalPages = range.count
  const originalBottomMargin = doc.page.margins.bottom
  for (let i = 1; i < totalPages; i++) { // bỏ qua trang bìa (index 0)
    doc.switchToPage(i)
    doc.page.margins.bottom = 0

    doc.font('VN-Bold').fontSize(8.5).fillColor(C.dark)
      .text('HARI SHOP · BÁO CÁO DOANH THU', 40, 20, { width: PAGE_W - 80, align: 'left', lineBreak: false })
    doc.font('VN').fontSize(8).fillColor(C.gray)
      .text(label, 40, 20, { width: PAGE_W - 80, align: 'right', lineBreak: false })
    doc.moveTo(40, 34).lineTo(PAGE_W - 40, 34).strokeColor('#e2e2ea').stroke()

    doc.font('VN').fontSize(7.5).fillColor(C.gray)
      .text(`Ngày xuất: ${generatedAt.toLocaleDateString('vi-VN')} — Generated by Hari Shop`, 40, PAGE_H - 30, { width: 300, lineBreak: false })
    doc.text(`Trang ${i} / ${totalPages - 1}`, PAGE_W - 140, PAGE_H - 30, { width: 100, align: 'right', lineBreak: false })

    doc.page.margins.bottom = originalBottomMargin
  }

  doc.end()
}

// ══════════════════════════════════════════════════════════════════
// ROUTE HANDLERS (kết nối DB qua getReportData)
// ══════════════════════════════════════════════════════════════════

// @desc    Xuất danh sách đơn hàng + báo cáo doanh thu ra Excel (.xlsx, nhiều Sheet)
// @route   GET /api/orders/admin/export/excel?startDate=&endDate=&status=
// @access  Private/Admin
const exportOrdersExcel = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query
  if (!startDate || !endDate) {
    res.status(400)
    throw new Error('Vui lòng chọn khoảng thời gian (startDate, endDate)')
  }
  const start = new Date(startDate); start.setHours(0, 0, 0, 0)
  const end = new Date(endDate); end.setHours(23, 59, 59, 999)

  const reportData = await getReportData({ start, end })
  const workbook = await buildExcelWorkbook(reportData, {
    label: `${startDate} → ${endDate}`,
    exportedBy: req.user?.name,
    generatedAt: new Date(),
    statusFilter: status || null,
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `bao-cao-doanh-thu_${startDate}_${endDate}.xlsx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
})

const exportRevenuePdf = asyncHandler(async (req, res) => {
  const { start, end, prevStart, prevEnd, label, prevLabel } = resolvePeriodRange(req.query)
  const reportData = await getReportData({ start, end, prevStart, prevEnd })
  reportData.prevLabel = prevLabel

  await buildPdfReport(reportData, { label, exportedBy: req.user?.name, generatedAt: new Date() }, res)
})

export { exportOrdersExcel, exportRevenuePdf }