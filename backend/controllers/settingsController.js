import asyncHandler from 'express-async-handler'
import Settings from '../models/settingsModel.js'

const SETTINGS_KEY = 'global'

// @desc    Get warehouse address settings
// @route   GET /api/settings/warehouse
// @access  Private/Admin
const getWarehouseSettings = asyncHandler(async (req, res) => {
  const doc = await Settings.findOne({ key: SETTINGS_KEY }).lean()
  res.json({ success: true, warehouseAddress: doc?.warehouseAddress || {} })
})

// @desc    Update warehouse address settings
// @route   PUT /api/settings/warehouse
// @access  Private/Admin
const updateWarehouseSettings = asyncHandler(async (req, res) => {
  const { warehouseAddress } = req.body || {}
  if (!warehouseAddress || typeof warehouseAddress !== 'object') {
    res.status(400)
    throw new Error('warehouseAddress is required')
  }

  const updated = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { warehouseAddress } },
    { upsert: true, new: true }
  ).lean()

  res.json({ success: true, warehouseAddress: updated.warehouseAddress })
})

export { getWarehouseSettings, updateWarehouseSettings }

