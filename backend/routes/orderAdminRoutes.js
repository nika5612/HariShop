import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  getRevenueAnalytics,
  deleteOrderByAdmin,
} from '../controllers/orderController.js'
import { exportOrdersExcel, exportRevenuePdf } from '../controllers/exportController.js'


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

// ── MỚI: Export báo cáo — danh sách đơn hàng ra Excel, doanh thu ra PDF ──
router
  .route('/export/excel')
  .get(protect, admin, exportOrdersExcel)

router
  .route('/export/pdf')
  .get(protect, admin, exportRevenuePdf)


router
  .route('/:id')
  .delete(protect, admin, deleteOrderByAdmin)

export default router