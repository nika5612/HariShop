import express from 'express'
import passport from '../config/passport.js'
import generateToken from '../utils/generateToken.js'
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
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
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

/* ===================== B11: GOOGLE OAUTH ===================== */
// Bước 1: chuyển hướng người dùng sang trang đăng nhập Google
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// Bước 2: Google gọi lại route này sau khi người dùng đồng ý
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // req.user được passport gán từ GoogleStrategy verify callback
    const token = generateToken(req.user._id)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    // Chuyển hướng về FE kèm token, FE sẽ tự lấy profile đầy đủ (xem GoogleAuthScreen)
    res.redirect(`${clientUrl}/google-auth?token=${token}`)
  }
)

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

/* ===================== B12: ĐỔI MẬT KHẨU QUA OTP ===================== */
router.post('/change-password/request-otp', protect, requestChangePasswordOtp)
router.post('/change-password/verify-otp', protect, verifyChangePasswordOtp)

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