import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  getRevenueAnalytics,
  deleteOrderByAdmin,
} from '../controllers/orderController.js'


const router = express.Router()


router
  .route('/revenue-summary')
  .get(protect, admin, getAdminRevenueSummary)


router
  .route('/brand-breakdown')
  .get(protect, admin, getAdminBrandBreakdown)

// ── MỚI (A4): thống kê doanh thu nâng cao theo tháng/quý/năm/tùy chọn ──
router
  .route('/analytics/revenue')
  .get(protect, admin, getRevenueAnalytics)


router
  .route('/:id')
  .delete(protect, admin, deleteOrderByAdmin)

export default router