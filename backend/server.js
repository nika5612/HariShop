import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import dotenv from 'dotenv'
import colors from 'colors'
import morgan from 'morgan'

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Load env TRƯỚC KHI import bất cứ thứ gì dùng process.env
dotenv.config({ path: path.join(__dirname, '../.env') })

// Import sau khi dotenv đã load
import connectDB from './config/db.js'
import productRoutes from './routes/productRoutes.js'
import userRoutes from './routes/userRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import orderAdminRoutes from './routes/orderAdminRoutes.js'
import sepayWebhookRoutes from './routes/sepayWebhookRoutes.js'
import voucherRoutes from './routes/voucherRoutes.js'

import uploadRoutes from './routes/uploadRoutes.js'


import shippingRoutes from './routes/shippingRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
// ✅ XÓA import transporter ở đây
import Settings from './models/settingsModel.js'

function envFirstTrim(keys) {
  for (const k of keys) {
    const v = (process.env[k] || '').trim()
    if (v) return v
  }
  return ''
}

function normalizeName(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function ghnFetchJson(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Token: token,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || Number(data?.code || 0) !== 200) {
    throw new Error(data?.message || `GHN request failed (${res.status})`)
  }
  return data
}

function pickBestByName(items, getName, targetName) {
  const target = normalizeName(targetName)
  if (!target) return null
  let best = null
  let bestScore = -1
  for (const it of items || []) {
    const name = normalizeName(getName(it))
    if (!name) continue
    let score = 0
    if (name === target) score = 100
    else if (name.includes(target) || target.includes(name)) score = 80
    else score = Math.min(60, Math.min(name.length, target.length))
    if (score > bestScore) {
      bestScore = score
      best = it
    }
  }
  return best
}

async function ensureDefaultWarehouseSettings() {
  const token = envFirstTrim(['GHN_TOKEN', 'TOKEN_GHN'])

  const defaultWarehouseAddress = {
    fullName: 'Hari Shop',
    phone: '0339959893',
    province: 'Long An',
    district: 'Cần Đước',
    ward: 'Tân Lân',
    detail: '56 ấp Nhà thờ',
    ghnDistrictId: 0,
    ghnWardCode: '',
  }

  // If settings already exist, do not overwrite user edits.
  const existing = await Settings.findOne({ key: 'global' }).lean()
  if (existing?.warehouseAddress && (existing.warehouseAddress.detail || existing.warehouseAddress.province)) {
    return
  }

  // Best-effort resolve GHN mapping for FROM address (for ETA + services).
  if (token) {
    try {
      const prov = await ghnFetchJson(
        'https://online-gateway.ghn.vn/shiip/public-api/master-data/province',
        token
      )
      const provinces = Array.isArray(prov?.data) ? prov.data : []
      const bestProvince = pickBestByName(provinces, (p) => p?.ProvinceName, defaultWarehouseAddress.province)
      const provinceId = Number(bestProvince?.ProvinceID || 0)

      if (provinceId) {
        const districtRes = await ghnFetchJson(
          'https://online-gateway.ghn.vn/shiip/public-api/master-data/district',
          token,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ province_id: provinceId }),
          }
        )
        const districts = Array.isArray(districtRes?.data) ? districtRes.data : []
        const bestDistrict = pickBestByName(districts, (d) => d?.DistrictName, defaultWarehouseAddress.district)
        const districtId = Number(bestDistrict?.DistrictID || 0)
        defaultWarehouseAddress.ghnDistrictId = districtId

        if (districtId) {
          const wardRes = await ghnFetchJson(
            `https://online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${districtId}`,
            token
          )
          const wards = Array.isArray(wardRes?.data) ? wardRes.data : []
          const bestWard = pickBestByName(wards, (w) => w?.WardName, defaultWarehouseAddress.ward)
          defaultWarehouseAddress.ghnWardCode = String(bestWard?.WardCode || '').trim()
        }
      }
    } catch (e) {
      console.warn('Default warehouse GHN mapping skipped:', e?.message)
    }
  }

  await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { warehouseAddress: defaultWarehouseAddress } },
    { upsert: true, new: true }
  )
}

const app = express()

// Middleware
app.use(express.json())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Routes
app.use('/api/products', productRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/orders/admin', orderAdminRoutes)
app.use('/api/vouchers', voucherRoutes)


app.use('/api/upload', uploadRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/settings', settingsRoutes)

// ✅ sePay webhook (no auth)
app.use('/api/payments', sepayWebhookRoutes)


// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK ✅',
    timestamp: new Date().toISOString(),
    dbConnected: !!process.env.MONGO_URI,
    env: process.env.NODE_ENV
  })
})

// Email health check
app.get('/api/health/email', async (req, res) => {
  const gmailUser = (process.env.GMAIL_USER || '').trim()
  const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  if (!gmailUser || !gmailAppPassword) {
    return res.status(200).json({
      ok: false,
      configured: false,
      message: 'Missing GMAIL_USER or GMAIL_APP_PASSWORD',
    })
  }

  try {
    const { default: createTransporter } = await import('./config/emailConfig.js')
    const t = createTransporter()
    await t.verify()
    return res.status(200).json({ ok: true, configured: true })
  } catch (e) {
    return res.status(200).json({
      ok: false,
      configured: true,
      message: e?.message,
      code: e?.code,
    })
  }
})



// Uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

// Production frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')))
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'))
  )
} else {
  app.get('/', (req, res) => {
    res.send('API is running...')
  })
}

// Error handlers
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  await ensureDefaultWarehouseSettings()
  app.listen(
    PORT,
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    )
  )
}

start()