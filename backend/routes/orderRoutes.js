import express from 'express'
const router = express.Router()
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateCodPaymentStatus,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  trackOrder,
  cancelOrderRequest,
  approveCancelOrder,
  rejectCancelOrder,
  requestRefund,
  completeRefund,
  sepayWebhook,
} from '../controllers/orderController.js'
import { protect, admin } from '../middleware/authMiddleware.js'

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders)
router.route('/myorders').get(protect, getMyOrders)

// ✅ SePay webhook — PUBLIC (không dùng protect, SePay gọi từ server của họ)
router.route('/sepay-webhook').post(sepayWebhook)

router.route('/:id').get(protect, getOrderById)
router.route('/:id/pay').put(protect, admin, updateOrderToPaid)
// MỚI: Admin đánh dấu đã thu/chưa thu tiền cho đơn COD
router.route('/:id/cod-payment').put(protect, admin, updateCodPaymentStatus)
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered)
router.route('/:id/status').put(protect, admin, updateOrderStatus)
router.route('/:id/track').get(protect, trackOrder)
router.route('/:id/cancel-request').put(protect, cancelOrderRequest)
router.route('/:id/approve-cancel').put(protect, admin, approveCancelOrder)
router.route('/:id/reject-cancel').put(protect, admin, rejectCancelOrder)
router.route('/:id/refund-request').put(protect, requestRefund)
router.route('/:id/refund-complete').put(protect, admin, completeRefund)

export default router