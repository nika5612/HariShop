import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  deleteOrderByAdmin,
} from '../controllers/orderController.js'


const router = express.Router()

// Admin revenue summary (last N months, paid only)
// GET /api/orders/admin/revenue-summary?months=1
router
  .route('/revenue-summary')
  .get(protect, admin, getAdminRevenueSummary)

// Admin brand breakdown pie data (last N months, paid only)
// GET /api/orders/admin/brand-breakdown?months=1
router
  .route('/brand-breakdown')
  .get(protect, admin, getAdminBrandBreakdown)

// Admin: delete order (only allowed if order is NOT paid)
// DELETE /api/orders/admin/:id
router
  .route('/:id')
  .delete(protect, admin, deleteOrderByAdmin)

export default router


