import express from 'express'
const router = express.Router()
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  trackOrder,
  cancelOrderRequest,
  approveCancelOrder,
  rejectCancelOrder,
  sepayWebhook,
} from '../controllers/orderController.js'
import { protect, admin } from '../middleware/authMiddleware.js'

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders)
router.route('/myorders').get(protect, getMyOrders)

// ✅ SePay webhook — PUBLIC (không dùng protect, SePay gọi từ server của họ)
router.route('/sepay-webhook').post(sepayWebhook)

router.route('/:id').get(protect, getOrderById)
router.route('/:id/pay').put(protect, admin, updateOrderToPaid)
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered)
router.route('/:id/track').get(protect, trackOrder)
router.route('/:id/cancel-request').put(protect, cancelOrderRequest)
router.route('/:id/approve-cancel').put(protect, admin, approveCancelOrder)
router.route('/:id/reject-cancel').put(protect, admin, rejectCancelOrder)

export default router