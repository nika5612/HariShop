import express from 'express'
const router = express.Router()

import {
  authUser,
  registerUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  addAddress,
  deleteAddress,
  setDefaultAddress,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  getUserAddresses,
  unlockCod,
} from '../controllers/userController.js'

import { protect, admin } from '../middleware/authMiddleware.js'

/* ===================== AUTH ===================== */
router.post('/login', authUser)
router.route('/').post(registerUser).get(protect, admin, getUsers)

/* ===================== OTP XÁC NHẬN EMAIL ===================== */
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)

/* ===================== FORGOT / RESET PASSWORD ===================== */
router.post('/forgotpassword', forgotPassword)
router.put('/resetpassword/:resettoken', resetPassword)

/* ===================== PROFILE ===================== */
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)

/* ===================== ADDRESSES ===================== */
router.get('/addresses', protect, getUserAddresses)
router.post('/addresses', protect, addAddress)
router.delete('/addresses/:addressId', protect, deleteAddress)
router.put('/addresses/:addressId/default', protect, setDefaultAddress)

/* ===================== ADMIN ===================== */
router
  .route('/:id')
  .delete(protect, admin, deleteUser)
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)


router.put('/:id/unlock-cod', protect, admin, unlockCod)

export default router