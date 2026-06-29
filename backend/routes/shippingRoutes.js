import express from 'express'
const router = express.Router()

import {
  getShippingQuotes,
  trackShipment,
  getProvinces,
  getDistricts,
  getWards,
} from '../controllers/shippingController.js'

// Public quotes for checkout (keys stay server-side)
router.post('/quotes', getShippingQuotes)

// Address picker master-data (GHN-based)
router.get('/provinces', getProvinces)
router.get('/districts', getDistricts)
router.get('/wards', getWards)

// Tracking (can be public; adjust to protect if needed)
router.get('/track/:carrier/:trackingId', trackShipment)

export default router

