import asyncHandler from 'express-async-handler'
import ShippingService from '../services/shipping/ShippingService.js'

const envFirstTrim = (keys) => {
  for (const k of keys) {
    const v = (process.env[k] || '').trim()
    if (v) return v
  }
  return ''
}

const ghnToken = () => envFirstTrim(['GHN_TOKEN', 'TOKEN_GHN', 'REACT_APP_TOKEN_GHN'])

async function ghnGetJson(url, token) {
  const res = await fetch(url, { headers: { Token: token } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || Number(data?.code || 0) !== 200) {
    throw new Error(data?.message || `GHN request failed (${res.status})`)
  }
  return data
}

// @desc    Get realtime shipping quotes (fee + ETA)
// @route   POST /api/shipping/quotes
// @access  Public
const getShippingQuotes = asyncHandler(async (req, res) => {
  const { cartItems, toAddress } = req.body || {}

  if (!toAddress || typeof toAddress !== 'object') {
    res.status(400)
    throw new Error('toAddress is required')
  }
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    res.status(400)
    throw new Error('cartItems is required')
  }

  const quotes = await ShippingService.getQuotes({ cartItems, toAddress })
  res.status(200).json({ success: true, quotes })
})

// @desc    GHN master-data provinces (for address picker)
// @route   GET /api/shipping/provinces
// @access  Public
const getProvinces = asyncHandler(async (req, res) => {
  const token = ghnToken()
  // Token optional for fallback later


  const data = await ghnGetJson(
    'https://online-gateway.ghn.vn/shiip/public-api/master-data/province',
    token
  )

  const list = Array.isArray(data?.data) ? data.data : []
  res.json({
    success: true,
    data: list.map((p) => ({
      provinceName: p?.ProvinceName,
      ghnProvinceId: p?.ProvinceID,
      vtpProvinceId: null,
    })),
  })
})

// @desc    GHN master-data districts by province
// @route   GET /api/shipping/districts?provinceId=<json or number>
// @access  Public
const getDistricts = asyncHandler(async (req, res) => {
  const token = ghnToken()
  // Token optional for fallback later


  const raw = req.query?.provinceId
  if (!raw) {
    res.status(400)
    throw new Error('provinceId is required')
  }

  let provinceId = 0
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    provinceId = Number(parsed?.ghnProvinceId || parsed?.ProvinceID || parsed?.provinceId || parsed || 0)
  } catch {
    provinceId = Number(raw || 0)
  }

  if (!provinceId) {
    res.status(400)
    throw new Error('Invalid provinceId')
  }

  const resJson = await fetch('https://online-gateway.ghn.vn/shiip/public-api/master-data/district', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Token: token },
    body: JSON.stringify({ province_id: provinceId }),
  })
  const data = await resJson.json().catch(() => ({}))
  if (!resJson.ok || Number(data?.code || 0) !== 200) {
    res.status(400)
    throw new Error(data?.message || 'GHN request failed')
  }

  const list = Array.isArray(data?.data) ? data.data : []
  res.json({
    success: true,
    data: list.map((d) => ({
      districtName: d?.DistrictName,
      ghnDistrictId: d?.DistrictID,
      vtpDistrictId: null,
    })),
  })
})

// @desc    GHN master-data wards by district
// @route   GET /api/shipping/wards?districtId=<json or number>
// @access  Public
const getWards = asyncHandler(async (req, res) => {
  const token = ghnToken()
  // Token optional for fallback later


  const raw = req.query?.districtId
  if (!raw) {
    res.status(400)
    throw new Error('districtId is required')
  }

  let districtId = 0
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    districtId = Number(parsed?.ghnDistrictId || parsed?.DistrictID || parsed?.districtId || parsed || 0)
  } catch {
    districtId = Number(raw || 0)
  }

  if (!districtId) {
    res.status(400)
    throw new Error('Invalid districtId')
  }

  const data = await ghnGetJson(
    `https://online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${districtId}`,
    token
  )
  const list = Array.isArray(data?.data) ? data.data : []
  res.json({
    success: true,
    data: list.map((w) => ({
      wardName: w?.WardName,
      ghnWardCode: w?.WardCode,
      vtpWardId: null,
    })),
  })
})

// @desc    Track shipment by carrier + trackingId
// @route   GET /api/shipping/track/:carrier/:trackingId
// @access  Public
const trackShipment = asyncHandler(async (req, res) => {
  const { carrier, trackingId } = req.params
  if (!carrier || !trackingId) {
    res.status(400)
    throw new Error('carrier and trackingId are required')
  }

  const result = await ShippingService.track({ carrier, trackingId })
  res.status(200).json({ success: true, ...result })
})

export { getShippingQuotes, trackShipment, getProvinces, getDistricts, getWards }

