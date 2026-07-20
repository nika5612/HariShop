// ══════════════════════════════════════════════════════════════════
// MỚI: tách hàm tính khoảng thời gian (start/end/label + kỳ trước) ra
// riêng để dùng chung giữa getRevenueAnalytics (orderController) và
// exportRevenuePdf (exportController) — tránh lặp lại logic period/
// month/quarter/year/custom ở 2 nơi.
// ══════════════════════════════════════════════════════════════════
export const resolvePeriodRange = (query = {}) => {
  const { period = 'month', month, year, quarter, startDate, endDate } = query
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

  return { start, end, prevStart, prevEnd, label, prevLabel }
}