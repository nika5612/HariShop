import asyncHandler from 'express-async-handler'
import Notification from '../models/notificationModel.js'

// Helper dùng ở các controller khác (order, v.v.) để tạo thông báo mới.
// Không export qua route — chỉ import trực tiếp trong code backend.
// `user`: để trống (null) = thông báo cho Admin. Truyền vào userId = thông báo riêng cho khách đó.
export const createNotification = async ({ type, title, message = '', link = '', order = null, user = null }) => {
  try {
    await Notification.create({ type, title, message, link, order, user })
  } catch (err) {
    // Không để lỗi tạo thông báo làm hỏng luồng chính (đặt đơn, huỷ đơn...)
    console.error('⚠️ Lỗi tạo notification:', err.message)
  }
}

/* ═══════════════════ THÔNG BÁO CHO ADMIN ═══════════════════ */

// @desc    Lấy danh sách thông báo gần nhất (Admin)
// @route   GET /api/notifications?limit=20
// @access  Private/Admin
const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)

  const notifications = await Notification.find({ user: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const unreadCount = await Notification.countDocuments({ user: null, isRead: false })

  res.json({ notifications, unreadCount })
})

// @desc    Lấy số thông báo chưa đọc của Admin
// @route   GET /api/notifications/unread-count
// @access  Private/Admin
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ user: null, isRead: false })
  res.json({ unreadCount })
})

// @desc    Đánh dấu tất cả thông báo Admin đã đọc
// @route   PUT /api/notifications/read-all
// @access  Private/Admin
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: null, isRead: false }, { $set: { isRead: true } })
  res.json({ success: true, unreadCount: 0 })
})

/* ═══════════════════ THÔNG BÁO CHO KHÁCH HÀNG ═══════════════════ */

// @desc    Lấy danh sách thông báo của khách hàng đang đăng nhập
// @route   GET /api/notifications/my?limit=20
// @access  Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false })

  res.json({ notifications, unreadCount })
})

// @desc    Số thông báo chưa đọc của khách hàng đang đăng nhập
// @route   GET /api/notifications/my/unread-count
// @access  Private
const getMyUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false })
  res.json({ unreadCount })
})

// @desc    Đánh dấu tất cả thông báo của khách đã đọc
// @route   PUT /api/notifications/my/read-all
// @access  Private
const markAllMyAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } })
  res.json({ success: true, unreadCount: 0 })
})

/* ═══════════════════ DÙNG CHUNG ═══════════════════ */

// @desc    Đánh dấu 1 thông báo đã đọc (tự kiểm tra quyền: Admin hoặc đúng chủ thông báo)
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)
  if (!notification) {
    res.status(404)
    throw new Error('Không tìm thấy thông báo')
  }

  const isOwnerCustomer = notification.user && notification.user.toString() === req.user._id.toString()
  const isAdminNotification = !notification.user && req.user.isAdmin

  if (!isOwnerCustomer && !isAdminNotification) {
    res.status(401)
    throw new Error('Không có quyền')
  }

  notification.isRead = true
  await notification.save()

  const unreadCount = await Notification.countDocuments({
    user: notification.user || null,
    isRead: false,
  })

  res.json({ success: true, unreadCount })
})

export {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  getMyNotifications,
  getMyUnreadCount,
  markAllMyAsRead,
  markAsRead,
}