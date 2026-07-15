import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const addressSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    province: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      default: '',
    },
    ward: {
      type: String,
      required: true,
    },
    // Provider-specific mapping (optional but enables realtime shipping)
    ghnDistrictId: { type: Number, default: 0 },
    ghnWardCode: { type: String, default: '' },
    vtpProvinceId: { type: Number, default: 0 },
    vtpDistrictId: { type: Number, default: 0 },
    vtpWardId: { type: Number, default: 0 },
    detail: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    // ===== B11: Đăng nhập Google OAuth =====
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // cho phép nhiều user có googleId = null
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },

    // ===== A2: Xác nhận email bằng OTP =====
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: { type: String },
    otpExpire: { type: Date },
    otpLastSentAt: { type: Date },

    addresses: [addressSchema],
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },

    // ===== B1: Hạn chế COD với tài khoản giao hàng thất bại =====
    codFailCount: { type: Number, default: 0 },
    codRestricted: { type: Boolean, default: false },
    codRestrictedAt: { type: Date },
    codUnlockedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

const User = mongoose.model('User', userSchema)

export default User