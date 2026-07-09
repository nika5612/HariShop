export const STATUS_STEPS = [
  { key: 'pending',           label: 'Đã đặt hàng',        icon: 'fas fa-receipt' },
  { key: 'confirmed',         label: 'Đã xác nhận',        icon: 'fas fa-clipboard-check' },
  { key: 'packing',           label: 'Đang đóng gói',      icon: 'fas fa-box-open' },
  { key: 'waiting_pickup',    label: 'Chờ lấy hàng',       icon: 'fas fa-dolly' },
  { key: 'picked_up',         label: 'Đã lấy hàng',        icon: 'fas fa-truck-loading' },
  { key: 'in_transit',        label: 'Đang vận chuyển',    icon: 'fas fa-shipping-fast' },
  { key: 'out_for_delivery',  label: 'Đang giao hàng',     icon: 'fas fa-motorcycle' },
  { key: 'delivered',         label: 'Giao thành công',    icon: 'fas fa-check-circle' },
]

// 4 trạng thái rẽ nhánh (không nằm trong luồng chính)
export const BRANCH_STATUSES = {
  delivery_failed: { label: 'Giao hàng thất bại', icon: 'fas fa-times-circle', color: '#ff6b6b' },
  returning:       { label: 'Đang hoàn về kho',    icon: 'fas fa-undo-alt',     color: '#ffd166' },
  returned:        { label: 'Đã hoàn về kho',      icon: 'fas fa-undo',        color: '#ff6b6b' },
  cancelled:       { label: 'Đơn hàng đã bị hủy',  icon: 'fas fa-ban',         color: '#ff6b6b' },
}

// Map đầy đủ 12 trạng thái → { label, icon, color } — dùng để hiển thị 1 badge duy nhất
export const ORDER_STATUS_LABELS = {
  pending:           { label: 'Đã đặt hàng',       icon: 'fas fa-receipt',          color: '#8a8fa3' },
  confirmed:         { label: 'Đã xác nhận',       icon: 'fas fa-clipboard-check',  color: '#5eb3f6' },
  packing:           { label: 'Đang đóng gói',     icon: 'fas fa-box-open',         color: '#ffd166' },
  waiting_pickup:    { label: 'Chờ lấy hàng',      icon: 'fas fa-dolly',            color: '#ffd166' },
  picked_up:         { label: 'Đã lấy hàng',       icon: 'fas fa-truck-loading',    color: '#33FFCC' },
  in_transit:        { label: 'Đang vận chuyển',   icon: 'fas fa-shipping-fast',    color: '#33FFCC' },
  out_for_delivery:  { label: 'Đang giao hàng',    icon: 'fas fa-motorcycle',       color: '#33FFCC' },
  delivered:         { label: 'Giao thành công',   icon: 'fas fa-check-circle',     color: '#4cdb80' },
  delivery_failed:   { label: 'Giao hàng thất bại',icon: 'fas fa-times-circle',     color: '#ff6b6b' },
  returning:         { label: 'Đang hoàn về kho',  icon: 'fas fa-undo-alt',         color: '#ffd166' },
  returned:          { label: 'Đã hoàn về kho',    icon: 'fas fa-undo',            color: '#ff6b6b' },
  cancelled:         { label: 'Đơn hàng đã bị hủy',icon: 'fas fa-ban',             color: '#ff6b6b' },
}

// Dropdown options cho Admin chọn khi cập nhật trạng thái
export const ADMIN_STATUS_OPTIONS = [
  ...STATUS_STEPS.map((s) => ({ value: s.key, label: s.label })),
  { value: 'delivery_failed', label: 'Giao hàng thất bại' },
  { value: 'returning',       label: 'Đang hoàn về kho' },
  { value: 'returned',        label: 'Đã hoàn về kho' },
  { value: 'cancelled',       label: 'Đơn hàng đã bị hủy' },
]

// Trả về status key hiện tại của đơn — ưu tiên field `status` mới
// fallback về logic cũ (isCancelled/isDelivered) cho đơn cũ chưa có statusHistory
export const getCurrentOrderStatus = (order) => {
  if (order?.status) return order.status
  if (order?.isCancelled) return 'cancelled'
  if (order?.isDelivered) return 'delivered'
  return 'pending'
}

// Trả về { label, icon, color } sẵn sàng để render
export const getOrderStatusInfo = (order) => {
  const key = getCurrentOrderStatus(order)
  return ORDER_STATUS_LABELS[key] || ORDER_STATUS_LABELS.pending
}

