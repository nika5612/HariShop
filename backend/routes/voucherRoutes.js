import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  applyVoucher,
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../controllers/voucherController.js'


const router = express.Router()

router.route('/apply').post(applyVoucher)

router
  .route('/')
  .get(protect, admin, getVouchers)
  .post(protect, admin, createVoucher)

router.route('/:id').put(protect, admin, updateVoucher).delete(protect, admin, deleteVoucher)

export default router


