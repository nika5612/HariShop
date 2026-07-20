// ══════════════════════════════════════════════════════════════════
// Test groupStatusBreakdown (backend/utils/reportData.js) — gom 12 trạng
// thái đơn hàng chi tiết thành 3 nhóm lớn (Thành công/Đang xử lý/Hủy-Thất
// bại) cho Pie Chart, để không còn nhiều trạng thái trùng màu như trước.
// ══════════════════════════════════════════════════════════════════
import { groupStatusBreakdown } from '../utils/reportData.js'

describe('groupStatusBreakdown', () => {
  test('gom đúng theo đúng bộ dữ liệu từng gặp lỗi thực tế (16 đơn, 5 trạng thái)', () => {
    const statuses = [
      ...Array(7).fill('cancelled'),
      ...Array(4).fill('delivered'),
      ...Array(3).fill('delivery_failed'),
      ...Array(1).fill('returning'),
      ...Array(1).fill('pending'),
    ]

    const result = groupStatusBreakdown(statuses)
    const total = result.reduce((sum, g) => sum + g.value, 0)

    expect(total).toBe(16)
    expect(result.find((g) => g.label === 'Thành công').value).toBe(4)
    expect(result.find((g) => g.label === 'Đang xử lý').value).toBe(1)
    expect(result.find((g) => g.label === 'Hủy / Thất bại').value).toBe(11) // 7+3+1

    // Không còn 2 nhóm nào trùng màu — đúng vấn đề đã sửa
    const colors = result.map((g) => g.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  test('nhóm không có đơn nào thì KHÔNG xuất hiện trong kết quả', () => {
    const result = groupStatusBreakdown(['delivered', 'delivered'])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Thành công')
  })

  test('mọi trạng thái "đang xử lý" (pending/confirmed/packing...) đều gom vào 1 nhóm', () => {
    const statuses = ['pending', 'confirmed', 'packing', 'waiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery']
    const result = groupStatusBreakdown(statuses)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Đang xử lý')
    expect(result[0].value).toBe(7)
  })

  test('mọi trạng thái kết thúc xấu (cancelled/delivery_failed/returning/returned) đều gom vào 1 nhóm', () => {
    const statuses = ['cancelled', 'delivery_failed', 'returning', 'returned']
    const result = groupStatusBreakdown(statuses)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Hủy / Thất bại')
    expect(result[0].value).toBe(4)
  })

  test('mảng rỗng trả về mảng rỗng, không lỗi', () => {
    expect(groupStatusBreakdown([])).toEqual([])
  })

  test('kết quả luôn theo đúng thứ tự Thành công → Đang xử lý → Hủy/Thất bại', () => {
    // Cố tình đưa vào theo thứ tự ngược để kiểm tra hàm tự sắp xếp lại đúng thứ tự nghiệp vụ
    const statuses = ['cancelled', 'pending', 'delivered']
    const result = groupStatusBreakdown(statuses)
    expect(result.map((g) => g.label)).toEqual(['Thành công', 'Đang xử lý', 'Hủy / Thất bại'])
  })
})