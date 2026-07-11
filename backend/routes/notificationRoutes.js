import express from 'express'
const router = express.Router()

import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  getMyNotifications,
  getMyUnreadCount,
  markAllMyAsRead,
  markAsRead,
} from '../controllers/notificationController.js'
import { protect, admin } from '../middleware/authMiddleware.js'

/* ── Khách hàng (đặt TRƯỚC route '/:id/read' để tránh xung đột path) ── */
router.route('/my').get(protect, getMyNotifications)
router.route('/my/unread-count').get(protect, getMyUnreadCount)
router.route('/my/read-all').put(protect, markAllMyAsRead)

/* ── Admin ── */
router.route('/').get(protect, admin, getNotifications)
router.route('/unread-count').get(protect, admin, getUnreadCount)
router.route('/read-all').put(protect, admin, markAllAsRead)

/* ── Dùng chung (tự kiểm tra quyền bên trong controller) ── */
router.route('/:id/read').put(protect, markAsRead)

export default router