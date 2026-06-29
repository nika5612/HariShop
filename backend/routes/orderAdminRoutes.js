import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getAdminRevenueSummary,
  getAdminBrandBreakdown,
  deleteOrderByAdmin,
} from '../controllers/orderController.js'


const router = express.Router()


router
  .route('/revenue-summary')
  .get(protect, admin, getAdminRevenueSummary)


router
  .route('/brand-breakdown')
  .get(protect, admin, getAdminBrandBreakdown)


router
  .route('/:id')
  .delete(protect, admin, deleteOrderByAdmin)

export default router


