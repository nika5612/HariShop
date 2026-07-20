import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  applyVoucher,
  getVouchers,
  getAvailableVouchers,
  validateVoucher,
  calculateVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../controllers/voucherController.js'


const router = express.Router()

router.route('/apply').post(applyVoucher)

// MỚI: 3 endpoint cho trải nghiệm khách hàng ở popup checkout
// (protect = cần đăng nhập, để kiểm tra được perUserLimit theo user)
router.route('/available').get(protect, getAvailableVouchers)
router.route('/validate').post(protect, validateVoucher)
router.route('/calculate').post(protect, calculateVoucher)

router
  .route('/')
  .get(protect, admin, getVouchers)
  .post(protect, admin, createVoucher)

router.route('/:id').put(protect, admin, updateVoucher).delete(protect, admin, deleteVoucher)

export default router