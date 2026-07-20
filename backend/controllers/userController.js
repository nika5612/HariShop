import asyncHandler from 'express-async-handler'
import crypto from 'crypto'
import mongoose from 'mongoose'
import generateToken from '../utils/generateToken.js'
import User from '../models/userModel.js'
import { checkRateLimit, resetRateLimit } from '../utils/rateLimit.js'

/* ===================== AUTH ===================== */

// MỚI: chống brute-force đăng nhập — tối đa 5 lần SAI trong 15 phút cho
// mỗi cặp (IP + email). Đếm theo cặp IP+email (không chỉ riêng IP) để
// không khóa nhầm cả văn phòng/mạng chung khi chỉ 1 người gõ sai; đồng
// thời không chỉ riêng email để 1 IP không thể dò mật khẩu hàng loạt tài
// khoản khác nhau mà không bị giới hạn.
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  const rateLimitKey = `login_${ip}_${String(email || '').toLowerCase()}`

  if (!checkRateLimit(rateLimitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
    res.status(429)
    throw new Error('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.')
  }

  const user = await User.findOne({ email })

  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      res.status(403)
      throw new Error('Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư và nhập mã OTP.')
    }

    // Đăng nhập đúng → mở khóa ngay, không tính lần này vào giới hạn tương lai
    resetRateLimit(rateLimitKey)

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

// MỚI (B12): thêm tham số `purpose` để dùng chung hàm gửi email OTP này cho
// cả đăng ký tài khoản ('register') lẫn đổi mật khẩu ('change-password').
const sendOtpEmail = async (user, otp, purpose = 'register') => {
  const gmailUser = (process.env.GMAIL_USER || '').trim()
  const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  if (!gmailUser || !gmailAppPassword) {
    console.warn('⚠️ GMAIL_USER/GMAIL_APP_PASSWORD chưa cấu hình - không gửi được email OTP.')
    return { emailSent: false, emailErrorMessage: 'Email chưa được cấu hình.' }
  }

  const isChangePassword = purpose === 'change-password'
  const subject = isChangePassword
    ? 'HariShop - Mã xác nhận đổi mật khẩu (OTP)'
    : 'HariShop - Mã xác nhận đăng ký (OTP)'
  const introText = isChangePassword
    ? 'Bạn (hoặc ai đó) vừa yêu cầu đổi mật khẩu cho tài khoản này. Vui lòng nhập mã OTP bên dưới để xác nhận:'
    : 'Cảm ơn bạn đã đăng ký tài khoản tại HariShop. Vui lòng nhập mã OTP bên dưới để xác nhận email:'
  const warningExtra = isChangePassword
    ? '<li>Nếu bạn KHÔNG yêu cầu đổi mật khẩu, vui lòng đổi mật khẩu ngay và bỏ qua email này</li>'
    : ''

  try {
    const createTransporter = (await import('../config/emailConfig.js')).default
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"HariShop" <${gmailUser}>`,
      to: user.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
          <p>${introText}</p>
          <div style="background: #1a1a2e; color: #33FFCC; padding: 20px; border-radius: 12px;
                      text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      border: 2px solid #33FFCC; margin: 20px 0;">
            ${otp}
          </div>
          <p><strong>Lưu ý:</strong></p>
          <ul style="color: #b8bcc8;">
            <li>Mã có hiệu lực trong ${OTP_EXPIRE_MINUTES} phút</li>
            <li>Không chia sẻ mã này cho bất kỳ ai</li>
            ${warningExtra}
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

  // MỚI: chống spam tạo tài khoản hàng loạt — tối đa 8 lần đăng ký/giờ/IP.
  // Giới hạn rộng hơn login vì đây là chặn bot spam, không phải brute-force
  // dò mật khẩu — người dùng thật gần như không bao giờ đăng ký 8 lần/giờ.
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  if (!checkRateLimit(`register_${ip}`, 8, 60 * 60 * 1000)) {
    res.status(429)
    throw new Error('Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.')
  }

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
  const canRequest = checkRateLimit(`forgot_${ip}`, 3, 60 * 60 * 1000)
  if (!canRequest) {
    res.status(429)
    throw new Error('Bạn đã yêu cầu đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.')
  }


  // ── SỬA: trước đây hàm này tự sinh mật khẩu MỚI và gửi thẳng qua email,
  // khiến route resetPassword (PUT /resetpassword/:token) — và cả màn hình
  // ResetPasswordScreen ở frontend đã xây sẵn — không bao giờ được dùng tới
  // vì resetPasswordToken chưa từng được gán. Giờ chuyển đúng sang luồng
  // gửi LINK reset kèm token (an toàn hơn: mật khẩu không nằm trong email,
  // và nếu gửi email thất bại thì mật khẩu cũ VẪN giữ nguyên, không bị đổi
  // "chay" rồi khoá người dùng ngoài tài khoản của chính họ).
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
  const RESET_TOKEN_EXPIRE_MINUTES = 30

  user.resetPasswordToken = hashedToken
  user.resetPasswordExpire = Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000
  await user.save()

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
  const resetLink = `${clientUrl}/resetpassword/${rawToken}`

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
        subject: 'HariShop - Đặt lại mật khẩu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33FFCC;">Chào ${user.name || 'Khách hàng'},</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để đặt mật khẩu mới:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" style="background: #33FFCC; color: #0f0f23; padding: 14px 28px;
                        border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;
                        display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color: #b8bcc8; font-size: 13px;">Hoặc copy link sau vào trình duyệt:<br>${resetLink}</p>
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul style="color: #b8bcc8;">
              <li>Link này chỉ có hiệu lực trong ${RESET_TOKEN_EXPIRE_MINUTES} phút</li>
              <li>Nếu bạn không yêu cầu, vui lòng bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên</li>
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
      ? 'Link đặt lại mật khẩu đã được gửi vào email của bạn.'
      : `Không thể gửi email đặt lại mật khẩu. ${emailErrorMessage || ''}`.trim(),
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

/* ===================== B12: ĐỔI MẬT KHẨU YÊU CẦU OTP ===================== */
// Bước 1: user đang đăng nhập, nhập mật khẩu mới → gọi API này để gửi OTP
// về email đã đăng ký. KHÔNG lưu mật khẩu mới vào DB ở bước này (chỉ dùng để
// validate độ dài cho UX tốt hơn) — mật khẩu mới được giữ tạm ở phía frontend
// (state) và gửi lại kèm OTP ở bước xác nhận, tránh lưu password chưa xác
// thực xuống database.
const requestChangePasswordOtp = asyncHandler(async (req, res) => {
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 6) {
    res.status(400)
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }

  // Chống spam: áp dụng cùng cooldown với OTP đăng ký
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

  const { emailSent, emailErrorMessage } = await sendOtpEmail(user, otp, 'change-password')

  res.json({
    emailSent,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    message: emailSent
      ? 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'
      : `Không gửi được email OTP. ${emailErrorMessage || ''}`.trim(),
  })
})

// Bước 2: user nhập OTP nhận được + gửi lại newPassword → xác thực rồi mới
// thực sự lưu mật khẩu mới.
const verifyChangePasswordOtp = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body

  if (!otp || !newPassword) {
    res.status(400)
    throw new Error('Vui lòng nhập mã OTP và mật khẩu mới.')
  }
  if (newPassword.length < 6) {
    res.status(400)
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('Không tìm thấy người dùng.')
  }

  if (!user.otpCode || !user.otpExpire || user.otpExpire < Date.now()) {
    res.status(400)
    throw new Error('Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã.')
  }

  if (hashOtp(otp.toString().trim()) !== user.otpCode) {
    res.status(400)
    throw new Error('Mã OTP không chính xác.')
  }

  // OTP hợp lệ → đổi mật khẩu thật sự (pre('save') trong userModel sẽ tự hash)
  user.password = newPassword
  user.otpCode = undefined
  user.otpExpire = undefined
  user.otpLastSentAt = undefined
  await user.save()

  res.json({ message: 'Đổi mật khẩu thành công.' })
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user) {
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email

    // MỚI (B12): bỏ đổi mật khẩu trực tiếp ở đây — giờ phải qua luồng OTP
    // (requestChangePasswordOtp + verifyChangePasswordOtp) để bảo mật hơn.

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

// ── MỚI: sort theo cột kiểu FC Online (click header) cho trang admin
// quản lý user. Whitelist field để tránh client truyền field tuỳ ý.
const SORTABLE_USER_FIELDS = {
  name: 'name',
  email: 'email',
  isAdmin: 'isAdmin',
  createdAt: 'createdAt',
}

const getUsers = asyncHandler(async (req, res) => {
  const requestedOrder = req.query.order === 'asc' ? 1 : req.query.order === 'desc' ? -1 : null
  const columnSortField = SORTABLE_USER_FIELDS[req.query.sortBy]
  const sortStage =
    columnSortField && requestedOrder !== null
      ? { [columnSortField]: requestedOrder }
      : { createdAt: -1 } // mặc định: user mới nhất lên đầu

  // ── SỬA LỖI BẢO MẬT: trước đây thiếu .select('-password'), khiến mật
  // khẩu đã hash của TOÀN BỘ user bị trả về cho response admin — dù đã
  // hash vẫn không nên để lộ ra ngoài.
  const users = await User.find({}).select('-password').sort(sortStage)
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
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
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