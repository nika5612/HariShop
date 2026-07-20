import asyncHandler from 'express-async-handler'
import Notification from '../models/notificationModel.js'
import { emitNotification } from '../socket.js'

export const createNotification = async ({ type, title, message = '', link = '', order = null, user = null }) => {
  try {
    const notification = await Notification.create({ type, title, message, link, order, user })
    emitNotification(notification)
  } catch (err) {
    console.error('⚠️ Lỗi tạo notification:', err.message)
  }
}

const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)

  const notifications = await Notification.find({ user: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const unreadCount = await Notification.countDocuments({ user: null, isRead: false })

  res.json({ notifications, unreadCount })
})

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ user: null, isRead: false })
  res.json({ unreadCount })
})

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: null, isRead: false }, { $set: { isRead: true } })
  res.json({ success: true, unreadCount: 0 })
})

const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false })

  res.json({ notifications, unreadCount })
})

const getMyUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false })
  res.json({ unreadCount })
})

const markAllMyAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } })
  res.json({ success: true, unreadCount: 0 })
})

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