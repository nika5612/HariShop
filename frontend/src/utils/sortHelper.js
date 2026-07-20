import React from 'react'

export const getNextSortConfig = (currentSort, columnKey) => {
  const { key, direction } = currentSort || {}

  // Đang click vào CỘT KHÁC → luôn bắt đầu chu kỳ mới ở 'desc'
  if (key !== columnKey) {
    return { key: columnKey, direction: 'desc' }
  }

  // Đang click LẶP LẠI cùng một cột → đi tiếp trong chu kỳ
  if (direction === 'desc') {
    return { key: columnKey, direction: 'asc' }
  }
  if (direction === 'asc') {
    return { key: null, direction: null } // quay về trạng thái ban đầu
  }

  // Phòng hờ (không nên rơi vào đây): coi như chưa sort → bắt đầu 'desc'
  return { key: columnKey, direction: 'desc' }
}

// Chuyển sortConfig { key, direction } → cặp query param sortBy/order
// gửi lên backend. Trả về object rỗng khi không sort (None) để các
// action tự loại bỏ tham số khỏi query string.
export const sortConfigToQuery = (sortConfig) => {
  if (!sortConfig || !sortConfig.key || !sortConfig.direction) return {}
  return { sortBy: sortConfig.key, order: sortConfig.direction }
}

// ── Hook nhỏ gọn: mỗi màn hình bảng chỉ cần 1 dòng
//    const { sortConfig, handleSort } = useTableSort()
// thay vì tự viết lại useState + hàm cycle ở từng nơi.
export const useTableSort = (initial = { key: null, direction: null }) => {
  const [sortConfig, setSortConfig] = React.useState(initial)

  const handleSort = (columnKey) => {
    setSortConfig((prev) => getNextSortConfig(prev, columnKey))
  }

  return { sortConfig, handleSort, setSortConfig }
}