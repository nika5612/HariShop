import asyncHandler from 'express-async-handler'
import crypto from 'crypto'
import mongoose from 'mongoose'
import generateToken from '../utils/generateToken.js'
import User from '../models/userModel.js'
import { checkRateLimit } from '../utils/rateLimit.js'

/* ===================== AUTH ===================== */

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })

  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      res.status(403)
      throw new Error('Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư và nhập mã OTP.')
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      addresses: user.addresses,
      codRestricted: user.codRestricted,   // MỚI (B1)
      codFailCount: user.codFailCount,     // MỚI (B1)
      token: generateToken(user._id),
    })
  } else {
    res.status(401)
    throw new Error('Email hoặc mật khẩu không chính xác.')
  }
})

/* ===================== OTP XÁC NHẬN EMAIL (A2) ===================== */

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

const OTP_EXPIRE_MINUTES = 10
const OTP_RESEND_COOLDOWN_SECONDS = 60

const sendOtpEmail = async (user, otp) => {
  const gmailUser = (process.env.GMAIL_USER || '').trim()
  const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  if (!gmailUser || !gmailAppPassword) {
    console.warn('⚠️ GMAIL_USER/GMAIL_APP_PASSWORD chưa cấu hình - không gửi được email OTP.')
    return { emailSent: false, emailErrorMessage: 'Email chưa được cấu hình.' }
  }

  try {
    const createTransporter = (await import('../config/emailConfig.js')).default
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"HariShop" <${gmailUser}>`,
      to: user.email,
      subject: 'HariShop - Mã xác nhận đăng ký (OTP)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại HariShop. Vui lòng nhập mã OTP bên dưới để xác nhận email:</p>
          <div style="background: #1a1a2e; color: #33FFCC; padding: 20px; border-radius: 12px;
                      text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      border: 2px solid #33FFCC; margin: 20px 0;">
            ${otp}
          </div>
          <p><strong>Lưu ý:</strong></p>
          <ul style="color: #b8bcc8;">
            <li>Mã có hiệu lực trong ${OTP_EXPIRE_MINUTES} phút</li>
            <li>Không chia sẻ mã này cho bất kỳ ai</li>
            <li>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
        </div>
      `,
    })
    return { emailSent: true, emailErrorMessage: null }
  } catch (err) {
    console.warn(`⚠️ OTP email failed for ${user.email}:`, err?.message)
    return { emailSent: false, emailErrorMessage: err?.message || 'Gửi email thất bại.' }
  }
}

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body

  if (!email || !otp) {
    res.status(400)
    throw new Error('Vui lòng nhập email và mã OTP.')
  }

  const user = await User.findOne({ email })

  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy tài khoản với email này.')
  }

  if (user.isVerified) {
    res.status(400)
    throw new Error('Tài khoản đã được xác thực trước đó.')
  }

  if (!user.otpCode || !user.otpExpire || user.otpExpire < Date.now()) {
    res.status(400)
    throw new Error('Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã.')
  }

  if (hashOtp(otp.toString().trim()) !== user.otpCode) {
    res.status(400)
    throw new Error('Mã OTP không chính xác.')
  }

  user.isVerified = true
  user.otpCode = undefined
  user.otpExpire = undefined
  user.otpLastSentAt = undefined
  await user.save()

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    addresses: user.addresses,
    token: generateToken(user._id),
  })
})

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    res.status(400)
    throw new Error('Vui lòng nhập email.')
  }

  const user = await User.findOne({ email })

  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy tài khoản với email này.')
  }

  if (user.isVerified) {
    res.status(400)
    throw new Error('Tài khoản đã được xác thực.')
  }

  if (user.otpLastSentAt) {
    const secondsSinceLastSend = (Date.now() - new Date(user.otpLastSentAt).getTime()) / 1000
    if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
      res.status(429)
      throw new Error(
        `Vui lòng đợi ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)} giây trước khi gửi lại mã.`
      )
    }
  }

  const otp = generateOtp()
  user.otpCode = hashOtp(otp)
  user.otpExpire = Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000
  user.otpLastSentAt = Date.now()
  await user.save()

  const { emailSent, emailErrorMessage } = await sendOtpEmail(user, otp)

  res.json({
    success: true,
    emailSent,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    message: emailSent
      ? 'Mã OTP mới đã được gửi vào email của bạn.'
      : `Không gửi được email. ${emailErrorMessage || ''}`.trim(),
  })
})

const registerUser = asyncHandler(async (req, res) => {
  const { name, phone, email, password, address } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Vui lòng nhập đầy đủ tên, email và mật khẩu.')
  }

  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('Người dùng đã tồn tại')
  }

  let addresses = []
  if (address) {
    if (!phone) {
      res.status(400)
      throw new Error('Vui lòng nhập số điện thoại.')
    }
    const addressObj = {
      ...address,
      fullName: name.trim(),
      phone: phone.trim(),
      isDefault: true,
    }
    try {
      validateAddressForRegister(addressObj)
    } catch (e) {
      res.status(400)
      throw e
    }
    addresses = [addressObj]
  }

  const otp = generateOtp()

  let user
  try {
    user = await User.create({
      name,
      email,
      password,
      addresses,
      isVerified: false,
      otpCode: hashOtp(otp),
      otpExpire: Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000,
      otpLastSentAt: Date.now(),
    })
  } catch (e) {
    res.status(400)
    throw e
  }

  if (user) {
    const { emailSent, emailErrorMessage } = await sendOtpEmail(user, otp)

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      needOtp: true,
      emailSent,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      message: emailSent
        ? 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.'
        : `Đăng ký thành công nhưng chưa gửi được email OTP. ${emailErrorMessage || ''}`.trim(),
    })
  } else {
    res.status(400)
    throw new Error('Dữ liệu người dùng không hợp lệ.')
  }
})

/* ===================== FORGOT / RESET PASSWORD ===================== */

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const ip = req.ip || req.connection.remoteAddress

  if (!email || !email.includes('@')) {
    res.status(400)
    throw new Error('Email không hợp lệ')
  }

  const user = await User.findOne({ email })

  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy tài khoản với email này.')
  }

  // Limit forgot-password requests: max 3 per 1 hour per IP
  const canRequest = checkRateLimit(ip)
  if (!canRequest) {
    res.status(429)
    throw new Error('Bạn đã yêu cầu đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.')
  }


  const securePassword =
    crypto.randomBytes(5).toString('hex') +
    crypto.randomBytes(5).toString('base64url').slice(0, 5)
  const newPassword = securePassword.slice(0, 10)

  user.password = newPassword
  await user.save()

  let emailSent = false
  let emailErrorMessage = null

  const gmailUser = (process.env.GMAIL_USER || '').trim()
  const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  if (!gmailUser || !gmailAppPassword) {
    emailErrorMessage = 'Email chưa được cấu hình (thiếu GMAIL_USER/GMAIL_APP_PASSWORD).'
  } else {
    try {
      // ✅ Gọi createTransporter() đúng cách
      const createTransporter = (await import('../config/emailConfig.js')).default
      const transporter = createTransporter()

      await transporter.sendMail({
        from: `"HariShop" <${gmailUser}>`,
        to: user.email,
        subject: 'HariShop - Mật khẩu mới của bạn',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
            <p>Chúng tôi đã cấp lại mật khẩu cho tài khoản của bạn:</p>
            <div style="background: #1a1a2e; color: #33FFCC; padding: 20px; border-radius: 12px;
                        text-align: center; font-size: 24px; font-weight: bold;
                        border: 2px solid #33FFCC; margin: 20px 0;">
              ${newPassword}
            </div>
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul style="color: #b8bcc8;">
              <li>Hãy đăng nhập và đổi mật khẩu ngay để bảo mật</li>
              <li>Nếu bạn không yêu cầu, vui lòng bỏ qua email này</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
          </div>
        `,
      })
      emailSent = true
    } catch (err) {
      emailErrorMessage = err?.message || 'Gửi email thất bại.'
      console.warn(`⚠️ Forgot password email failed for ${user.email}:`, emailErrorMessage)
    }
  }

  res.json({
    success: true,
    emailSent,
    message: emailSent
      ? 'Mật khẩu mới đã được gửi vào email của bạn.'
      : `Đã cập nhật mật khẩu mới nhưng chưa gửi được email. ${emailErrorMessage || ''}`.trim(),
  })
})

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    res.status(400)
    throw new Error('Token không hợp lệ hoặc đã hết hạn.')
  }

  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: generateToken(user._id),
    message: 'Đặt lại mật khẩu thành công.',
  })
})

/* ===================== PROFILE ===================== */

const getUserProfile = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    res.status(400)
    throw new Error('Invalid user ID')
  }

  const user = await User.findById(req.user._id)

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      addresses: user.addresses,
      codRestricted: user.codRestricted,   // MỚI (B1)
      codFailCount: user.codFailCount,     // MỚI (B1)
    })
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user) {
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email

    if (req.body.password) {
      user.password = req.body.password
    }

    const updatedUser = await user.save()

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      addresses: updatedUser.addresses,
      codRestricted: updatedUser.codRestricted,   // MỚI (B1)
      codFailCount: updatedUser.codFailCount,     // MỚI (B1)
      token: generateToken(updatedUser._id),
    })
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
})

/* ===================== ADDRESS ===================== */

const validateAddressForRegister = (address) => {
  const requiredFields = ['fullName', 'phone', 'province', 'ward', 'detail']
  for (const field of requiredFields) {
    if (!address[field] || address[field].toString().trim() === '') {
      throw new Error(`Địa chỉ thiếu trường bắt buộc: ${field}`)
    }
  }
  return true
}

const validateAddress = (address) => {
  const requiredFields = ['fullName', 'phone', 'province', 'ward', 'detail']
  for (const field of requiredFields) {
    if (!address[field] || address[field].toString().trim() === '') {
      throw new Error(`Địa chỉ thiếu trường bắt buộc: ${field}`)
    }
  }
  return true
}

const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy người dùng')
  }

  validateAddress(req.body)

  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false
    })
  }

  user.addresses.push(req.body)
  await user.save()
  res.status(201).json(user.addresses)
})

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  user.addresses = user.addresses.filter(
    (addr) => addr._id.toString() !== req.params.addressId
  )

  await user.save()
  res.json(user.addresses)
})

const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  user.addresses.forEach((addr) => {
    addr.isDefault = addr._id.toString() === req.params.addressId
  })

  await user.save()
  res.json(user.addresses)
})

/* ===================== ADMIN ===================== */

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
  res.json(users)
})

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (user) {
    await user.deleteOne()
    res.json({ message: 'Đã xóa người dùng.' })
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
})

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')

  if (user) {
    res.json(user)
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
})

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (user) {
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email
    user.isAdmin = req.body.isAdmin

    const updatedUser = await user.save()

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    })
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng')
  }
})

// ===================== B1: Admin mở khóa COD thủ công =====================
const unlockCod = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
  if (!user.codRestricted) {
    res.status(400)
    throw new Error('Tài khoản này hiện không bị hạn chế COD.')
  }

  user.codRestricted = false
  user.codFailCount = 0
  user.codUnlockedAt = new Date()
  await user.save()

  // Email thông báo (không chặn luồng nếu lỗi)
  try {
    const gmailUser = (process.env.GMAIL_USER || '').trim()
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
    if (gmailUser && gmailAppPassword) {
      const createTransporter = (await import('../config/emailConfig.js')).default
      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"HariShop" <${gmailUser}>`,
        to: user.email,
        subject: 'HariShop - Tài khoản của bạn đã được mở lại COD',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
            <p>HariShop xác nhận tài khoản của bạn đã được <strong>mở lại quyền thanh toán khi nhận hàng (COD)</strong> bởi quản trị viên.</p>
            <p>Bạn có thể tiếp tục sử dụng COD cho các đơn hàng tiếp theo.</p>
            <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">Trân trọng,<br>HariShop Team</p>
          </div>
        `,
      })
    }
  } catch (e) {
    console.warn('⚠️ Không gửi được email mở khóa COD (non-fatal):', e.message)
  }

  try {
    const { createNotification } = await import('./notificationController.js')
    await createNotification({
      type: 'cod_unlocked',
      title: 'Tài khoản của bạn đã được mở lại thanh toán COD',
      message: 'Quản trị viên đã mở khóa COD cho tài khoản của bạn.',
      link: '/profile',
      user: user._id,
    })
  } catch (e) {
    console.warn('⚠️ Không tạo được notification mở khóa COD (non-fatal):', e.message)
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    codRestricted: user.codRestricted,
    codFailCount: user.codFailCount,
  })
})

const getUserAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses')

  if (user) {
    res.json(user.addresses || [])
  } else {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }
})

export {
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
  unlockCod,
  getUserAddresses,
}