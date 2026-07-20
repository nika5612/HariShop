import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ══════════════════════════════════════════════════════════════════
// Render biểu đồ ra ảnh PNG (qua SVG → sharp) — dùng chung cho Excel
// (worksheet.addImage) và PDF (doc.image()). Lý do dùng ảnh thay vì
// chart "sống": ExcelJS không hỗ trợ tạo chart object thật.
//
// Font: nhúng "Be Vietnam Pro" (base64 qua @font-face) — font thiết kế
// riêng cho tiếng Việt, đảm bảo hiển thị đúng dấu bất kể máy chủ cài
// font gì (không phụ thuộc "sans-serif" hệ thống).
//
// Độ nét: SVG được rasterize ở mật độ 2x (retina) rồi khi nhúng vào
// Excel/PDF vẫn khai báo đúng kích thước hiển thị "logic" như cũ — ảnh
// chỉ nét hơn, không to hơn trên trang.
// ══════════════════════════════════════════════════════════════════

const FONT_REGULAR_PATH = path.join(__dirname, '../assets/fonts/BeVietnamPro-Regular.ttf')
const FONT_SEMIBOLD_PATH = path.join(__dirname, '../assets/fonts/BeVietnamPro-SemiBold.ttf')
const FONT_BOLD_PATH = path.join(__dirname, '../assets/fonts/BeVietnamPro-Bold.ttf')

// Đọc + encode base64 MỘT LẦN DUY NHẤT khi module load.
const b64 = (p) => fs.readFileSync(p).toString('base64')
const FONT_REGULAR_B64 = b64(FONT_REGULAR_PATH)
const FONT_SEMIBOLD_B64 = b64(FONT_SEMIBOLD_PATH)
const FONT_BOLD_B64 = b64(FONT_BOLD_PATH)

const FONT_FACE_STYLE = `
  <style>
    @font-face {
      font-family: 'ReportFont';
      font-weight: 400;
      src: url(data:font/ttf;base64,${FONT_REGULAR_B64}) format('truetype');
    }
    @font-face {
      font-family: 'ReportFont';
      font-weight: 600;
      src: url(data:font/ttf;base64,${FONT_SEMIBOLD_B64}) format('truetype');
    }
    @font-face {
      font-family: 'ReportFont';
      font-weight: 700;
      src: url(data:font/ttf;base64,${FONT_BOLD_B64}) format('truetype');
    }
    text { font-family: 'ReportFont', sans-serif; }
  </style>
`

const BRAND = { primary: '#22e3b6', dark: '#1b1b32', white: '#ffffff', gray: '#6B7280' }
const PALETTE = ['#22e3b6', '#5eb3f6', '#ffd166', '#ff6b6b', '#a78bfa', '#8a8fa3']

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Ước lượng độ rộng chuỗi (px) ở 1 cỡ font — dùng để tự tính kích thước ảnh.
const estimateTextWidth = (text, fontSize) => String(text).length * fontSize * 0.6

// Rasterize SVG ở mật độ cao (mặc định 2x) để chữ/nét trong PDF-Excel sắc nét,
// nhưng vẫn giữ nguyên kích thước hiển thị "logic" (width/height) như đã khai.
const RENDER_SCALE = 2
const rasterize = (svg) => sharp(Buffer.from(svg), { density: 72 * RENDER_SCALE }).png().toBuffer()

// ── Biểu đồ cột dọc (doanh thu theo ngày/tháng/năm) ──────────────────
export const renderBarChartPng = async ({
  data, // [{ label, value }]
  width = 900,
  height = 380,
  color = BRAND.primary,
  title = '', // MỚI: nếu có, vẽ tiêu đề căn giữa ngay trong ảnh (đảm bảo luôn thẳng hàng với biểu đồ)
  valueFormatter = (v) => Number(v).toLocaleString('vi-VN'),
}) => {
  const titleH = title ? 36 : 0
  const padTop = 30 + titleH
  const padBottom = 46
  const padLeft = 16
  const padRight = 16
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const n = Math.max(data.length, 1)
  const gap = Math.min(14, chartW / n * 0.25)
  const barW = Math.max(4, chartW / n - gap)

  let bars = ''
  let labels = ''
  data.forEach((d, i) => {
    const h = maxVal > 0 ? (d.value / maxVal) * chartH : 0
    const x = padLeft + i * (barW + gap) + gap / 2
    const y = padTop + (chartH - h)
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${color}"/>`
    if (n <= 20) {
      labels += `<text x="${(x + barW / 2).toFixed(1)}" y="${height - padBottom + 18}" font-size="12" fill="${BRAND.dark}" text-anchor="middle">${esc(d.label)}</text>`
    }
    if (n <= 15 && h > 14) {
      labels += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="10.5" fill="${BRAND.dark}" text-anchor="middle">${esc(valueFormatter(d.value))}</text>`
    }
  })

  const axisY = padTop + chartH
  const titleSvg = title
    ? `<text x="${width / 2}" y="26" font-size="23" font-weight="600" fill="${BRAND.dark}" text-anchor="middle">${esc(title)}</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${FONT_FACE_STYLE}
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    ${titleSvg}
    <line x1="${padLeft}" y1="${axisY}" x2="${width - padRight}" y2="${axisY}" stroke="#e2e2ea" stroke-width="1"/>
    ${bars}
    ${labels}
  </svg>`

  return { buffer: await rasterize(svg), width, height }
}
export const renderPieChartPng = async ({
  data, // [{ label, value, color? }]
  width, // để trống → tự tính theo độ dài chú giải, tránh bị cắt chữ
  height = 320,
  title = '', // MỚI: tiêu đề căn giữa nhúng trong ảnh, thay vì vẽ rời bên ngoài (dễ lệch)
}) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const titleH = title ? 40 : 0
  const chartAreaHeight = height
  const totalHeight = height + titleH

  const cx = chartAreaHeight / 2 + titleH
  const cy = chartAreaHeight / 2 + titleH
  const r = chartAreaHeight / 2 - 20

  const slices = data.map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }))

  // Tự tính độ rộng ảnh theo nhãn chú giải DÀI NHẤT — tránh bị cắt chữ.
  const legendFontSize = 16
  const legendX = chartAreaHeight + 24
  const colorBoxSize = 16
  const textGap = 26 // MỚI: khoảng cách giữa ô màu và chữ
  const maxLegendTextLen = Math.max(
    ...slices.map((d) => {
      const pct = Math.round((d.value / total) * 1000) / 10
      // Ước lượng riêng phần tên trạng thái (đậm) + phần % (thường) — tổng
      // độ dài xấp xỉ để tính bề rộng cần thiết.
      return estimateTextWidth(`${d.label}  ${pct}%`, legendFontSize)
    }),
    0
  )
  const computedWidth = legendX + colorBoxSize + textGap + maxLegendTextLen + 24
  const finalWidth = width || Math.max(480, Math.ceil(computedWidth))

  let paths = ''
  let angleStart = -Math.PI / 2

  slices.forEach((d) => {
    const fraction = d.value / total
    const angleEnd = angleStart + fraction * Math.PI * 2
    const x1 = cx + r * Math.cos(angleStart)
    const y1 = cy + r * Math.sin(angleStart)
    const x2 = cx + r * Math.cos(angleEnd)
    const y2 = cy + r * Math.sin(angleEnd)
    const largeArc = angleEnd - angleStart > Math.PI ? 1 : 0

    // MỚI: viền trắng mỏng giữa các lát để phân tách rõ ràng hơn.
    const strokeAttr = `stroke="#fff" stroke-width="1"`

    if (fraction >= 0.999) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${d.color}" ${strokeAttr}/>`
    } else if (fraction > 0) {
      paths += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${d.color}" ${strokeAttr}/>`
    }
    angleStart = angleEnd
  })

  // Chú giải (legend) bên phải — cách dòng 34px, ô màu 16×16 bo góc 4px,
  // tên trạng thái đậm màu tối, phần trăm màu xám để nổi bật tên hơn.
  const legendLineHeight = 34
  let legend = ''
  slices.forEach((d, i) => {
    const y = titleH + 34 + i * legendLineHeight
    const pct = Math.round((d.value / total) * 1000) / 10
    const textX = legendX + colorBoxSize + textGap
    legend += `
      <rect x="${legendX}" y="${y - colorBoxSize / 2 - 2}" width="${colorBoxSize}" height="${colorBoxSize}" rx="4" fill="${d.color}"/>
      <text x="${textX}" y="${y}" font-size="${legendFontSize}" font-weight="600" fill="${BRAND.dark}">${esc(d.label)}</text>
      <text x="${textX + estimateTextWidth(d.label, legendFontSize) + 8}" y="${y}" font-size="${legendFontSize}" fill="${BRAND.gray}">${pct}%</text>
    `
  })

  const titleSvg = title
    ? `<text x="${finalWidth / 2}" y="26" font-size="23" font-weight="600" fill="${BRAND.dark}" text-anchor="middle">${esc(title)}</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth}" height="${totalHeight}">
    ${FONT_FACE_STYLE}
    <rect width="${finalWidth}" height="${totalHeight}" fill="#ffffff"/>
    ${titleSvg}
    ${paths}
    ${legend}
  </svg>`

  return { buffer: await rasterize(svg), width: finalWidth, height: totalHeight }
}