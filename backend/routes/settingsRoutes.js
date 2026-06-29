import express from 'express'
const router = express.Router()

import { protect, admin } from '../middleware/authMiddleware.js'
import { getWarehouseSettings, updateWarehouseSettings } from '../controllers/settingsController.js'

router
  .route('/warehouse')
  .get(protect, admin, getWarehouseSettings)
  .put(protect, admin, updateWarehouseSettings)

export default router

