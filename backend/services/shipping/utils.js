export function withTimeout(promise, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const p = Promise.resolve(promise)
  return p.finally(() => clearTimeout(timer))
}

export function formatEtaLabel(etaDate) {
  try {
    const d = new Date(etaDate)
    if (Number.isNaN(d.getTime())) return null
    // Use Vietnamese locale label like: "Nhận hàng vào Thứ 5, ngày 20/04"
    const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' })
    const dayMonth = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    return `Nhận hàng vào ${capitalizeFirst(weekday)}, ngày ${dayMonth}`
  } catch {
    return null
  }
}

function capitalizeFirst(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

