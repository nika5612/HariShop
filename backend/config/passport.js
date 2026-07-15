import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import crypto from 'crypto'
import User from '../models/userModel.js'

// ===== B11: Đăng nhập Google OAuth =====
// Chiến lược stateless (session: false) vì app đã dùng JWT sẵn cho toàn bộ
// auth (giống authUser/registerUser trong userController). Passport chỉ
// đóng vai trò xác thực với Google rồi trả user về, KHÔNG dùng session.
// ⚠️ QUAN TRỌNG: KHÔNG gọi passport.use(new GoogleStrategy(...)) ngay ở top-level
// của file này. Trong ES Modules, mọi `import` (kể cả import file này từ
// userRoutes.js/server.js) đều được nạp và chạy TRƯỚC code còn lại của
// server.js — tức là TRƯỚC cả dotenv.config() — nên process.env sẽ rỗng nếu
// khởi tạo Strategy ngay lúc import. Vì vậy phải bọc trong 1 hàm và gọi hàm
// đó ra TỪ server.js, SAU khi dotenv.config() đã chạy xong.
export function configureGoogleStrategy() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/users/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null

        if (!email) {
          return done(new Error('Tài khoản Google không có email công khai.'), null)
        }

        // 1) Đã từng đăng nhập Google trước đó → tìm theo googleId
        let user = await User.findOne({ googleId: profile.id })

        if (!user) {
          // 2) Chưa có googleId nhưng email đã tồn tại (đăng ký thủ công trước đó)
          //    → liên kết tài khoản Google vào tài khoản email đó
          user = await User.findOne({ email })

          if (user) {
            user.googleId = profile.id
            user.isVerified = true // Google đã xác thực email hộ
            if (user.authProvider === 'local' && !user.googleId) {
              user.authProvider = 'google'
            }
            await user.save()
          }
        }

        if (!user) {
          // 3) Chưa từng có tài khoản → tự tạo mới, isVerified = true luôn
          const randomPassword = crypto.randomBytes(24).toString('hex')
          user = await User.create({
            name: profile.displayName || email.split('@')[0],
            email,
            password: randomPassword, // user không dùng để đăng nhập, chỉ để thoả schema
            googleId: profile.id,
            authProvider: 'google',
            isVerified: true,
          })
        }

        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
    )
  )
}

export default passport