// ══════════════════════════════════════════════════════════════════
// Test resolvePeriodRange (backend/utils/reportPeriod.js) — hàm tính
// khoảng ngày cho báo cáo doanh thu (tháng/quý/năm/tuỳ chọn) + kỳ liền
// trước để so sánh tăng trưởng. Trọng tâm test là các trường hợp BIÊN
// dễ lỗi off-by-one: tháng 1 → kỳ trước phải là tháng 12 năm TRƯỚC (lùi
// năm), quý 1 → kỳ trước phải là quý 4 năm trước.
// ══════════════════════════════════════════════════════════════════
import { resolvePeriodRange } from '../utils/reportPeriod.js'

describe('resolvePeriodRange — period=month', () => {
  test('tháng bình thường (tháng 7) — kỳ trước là tháng 6 cùng năm', () => {
    const { start, end, prevStart, prevEnd, label, prevLabel } =
      resolvePeriodRange({ period: 'month', month: 7, year: 2026 })

    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6) // tháng 7 = index 6
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(6)
    expect(end.getDate()).toBe(31) // tháng 7 có 31 ngày

    expect(prevStart.getMonth()).toBe(5) // tháng 6
    expect(prevStart.getFullYear()).toBe(2026)
    expect(label).toBe('Tháng 7/2026')
    expect(prevLabel).toBe('Tháng 6/2026')
  })

  test('tháng 1 — kỳ trước phải LÙI SANG NĂM TRƯỚC (tháng 12/năm-1)', () => {
    const { prevStart, prevEnd, prevLabel } =
      resolvePeriodRange({ period: 'month', month: 1, year: 2026 })

    expect(prevStart.getFullYear()).toBe(2025) // lùi năm — lỗi off-by-one hay gặp nhất
    expect(prevStart.getMonth()).toBe(11) // tháng 12 (index 11)
    expect(prevEnd.getDate()).toBe(31)
    expect(prevLabel).toBe('Tháng 12/2025')
  })

  test('tháng 2 năm nhuận (2028) — end phải là ngày 29, không phải 28', () => {
    const { end } = resolvePeriodRange({ period: 'month', month: 2, year: 2028 })
    expect(end.getDate()).toBe(29)
  })
})

describe('resolvePeriodRange — period=quarter', () => {
  test('quý 2 — kỳ trước là quý 1 cùng năm', () => {
    const { start, end, prevStart, prevLabel } =
      resolvePeriodRange({ period: 'quarter', quarter: 2, year: 2026 })

    expect(start.getMonth()).toBe(3) // quý 2 bắt đầu tháng 4 (index 3)
    expect(end.getMonth()).toBe(5) // kết thúc tháng 6 (index 5)
    expect(prevStart.getMonth()).toBe(0) // quý 1 bắt đầu tháng 1
    expect(prevLabel).toBe('Quý 1/2026')
  })

  test('quý 1 — kỳ trước phải LÙI SANG QUÝ 4 NĂM TRƯỚC', () => {
    const { prevStart, prevLabel } =
      resolvePeriodRange({ period: 'quarter', quarter: 1, year: 2026 })

    expect(prevStart.getFullYear()).toBe(2025)
    expect(prevStart.getMonth()).toBe(9) // quý 4 bắt đầu tháng 10 (index 9)
    expect(prevLabel).toBe('Quý 4/2025')
  })
})

describe('resolvePeriodRange — period=year', () => {
  test('năm — kỳ trước là năm liền trước', () => {
    const { start, end, prevStart, prevEnd, label, prevLabel } =
      resolvePeriodRange({ period: 'year', year: 2026 })

    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
    expect(prevStart.getFullYear()).toBe(2025)
    expect(prevEnd.getFullYear()).toBe(2025)
    expect(label).toBe('Năm 2026')
    expect(prevLabel).toBe('Năm 2025')
  })
})

describe('resolvePeriodRange — period=custom', () => {
  test('khoảng tuỳ chọn — kỳ trước có cùng độ dài, nằm ngay trước khoảng đã chọn', () => {
    const { start, end, prevStart, prevEnd } = resolvePeriodRange({
      period: 'custom',
      startDate: '2026-07-10',
      endDate: '2026-07-19', // 10 ngày
    })

    const durationMs = end.getTime() - start.getTime()
    const prevDurationMs = prevEnd.getTime() - prevStart.getTime()

    // Cho phép sai lệch nhỏ do start/end set giờ 00:00/23:59 còn prevEnd = start-1ms
    expect(Math.round(prevDurationMs / 1000)).toBe(Math.round(durationMs / 1000))
    expect(prevEnd.getTime()).toBeLessThan(start.getTime()) // kỳ trước phải kết thúc TRƯỚC kỳ hiện tại
  })
})