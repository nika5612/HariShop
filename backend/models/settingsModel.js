import mongoose from 'mongoose'

const warehouseAddressSchema = mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    province: { type: String, default: '' },
    district: { type: String, default: '' },
    ward: { type: String, default: '' },
    detail: { type: String, default: '' },
    // Provider mapping (optional). For GHN: districtId + wardCode.
    ghnDistrictId: { type: Number, default: 0 },
    ghnWardCode: { type: String, default: '' },
    districtCode: { type: String, default: '' }, // legacy/other providers
    wardCode: { type: String, default: '' }, // legacy/other providers
  },
  { _id: false }
)

const settingsSchema = mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    warehouseAddress: { type: warehouseAddressSchema, default: () => ({}) },
  },
  { timestamps: true }
)

const Settings = mongoose.model('Settings', settingsSchema)
export default Settings

