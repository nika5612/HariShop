import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import express from 'express'
import dotenv from 'dotenv'
import colors from 'colors'
import morgan from 'morgan'
import helmet from 'helmet'

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
// (Đã gỡ import sepayWebhookRoutes — route đó dùng sai định dạng payload và
// sai chuẩn chữ ký so với SePay thật. Xác thực HMAC nay được làm đúng ngay
// trong route /api/orders/sepay-webhook, xem orderController.js.)
import voucherRoutes from './routes/voucherRoutes.js'

import uploadRoutes from './routes/uploadRoutes.js'


import shippingRoutes from './routes/shippingRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { initSocket } from './socket.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import passport, { configureGoogleStrategy } from './config/passport.js' // B11: Google OAuth
import { configureCloudinary } from './config/cloudinary.js' // B10: Cloudinary
// ✅ XÓA import transporter ở đây
import Settings from './models/settingsModel.js'
import { autoSyncPendingGHNOrders, autoSyncPendingGHTKOrders } from './controllers/orderController.js' // MỚI: tự động đồng bộ trạng thái GHN + GHTK
import logger from './utils/logger.js'

// MỚI: bắt các lỗi crash toàn cục mà middleware errorHandler (chỉ áp dụng
// cho request Express) không bắt được — lỗi async ném ra ngoài mọi route
// (VD: lỗi trong 1 setInterval/cron nào đó quên try/catch) hoặc Promise bị
// reject mà không ai .catch(). Trước đây các lỗi này làm crash server ÂM
// THẦM (Node in ra stderr rồi thoát) mà không có dòng log rõ ràng nào ghi
// lại NGUYÊN NHÂN trước khi tắt.
process.on('uncaughtException', (err) => {
  logger.error(`[uncaughtException] ${err.message}\n${err.stack}`)
})
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)
  logger.error(`[unhandledRejection] ${message}`)
})

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
      logger.warn(`Default warehouse GHN mapping skipped: ${e?.message}`)
    }
  }

  await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { warehouseAddress: defaultWarehouseAddress } },
    { upsert: true, new: true }
  )
}

// B11: Khởi tạo GoogleStrategy TẠI ĐÂY (sau dotenv.config() ở trên) để
// process.env.GOOGLE_CLIENT_ID/SECRET chắc chắn đã có giá trị.
configureGoogleStrategy()

// B10: Tương tự, cấu hình Cloudinary SAU dotenv.config() (không phải lúc import)
configureCloudinary()

const app = express()

// MỚI: Render (và hầu hết PaaS) đặt app sau 1 lớp reverse proxy — proxy tự
// xử lý HTTPS ở biên rồi forward request vào app dưới dạng HTTP nội bộ. Nếu
// không khai báo trust proxy, Express sẽ luôn nghĩ req.protocol là 'http',
// làm sai URL callback mà Passport Google OAuth tự build (gây lệch với
// Authorized redirect URI đã đăng ký trên Google Cloud Console) và khiến
// cookie 'secure' không hoạt động đúng. '1' nghĩa là tin đúng 1 lớp proxy
// phía trước (đúng với hạ tầng của Render).
app.set('trust proxy', 1)

// MỚI: helmet — thêm các HTTP security header cơ bản (chống clickjacking
// qua X-Frame-Options, chặn MIME-sniffing qua X-Content-Type-Options, ẩn
// header X-Powered-By tiết lộ đang dùng Express, v.v).
// contentSecurityPolicy tắt mặc định — CSP mặc định của helmet chặn khá
// nghiêm ngặt (script/ảnh/font từ domain khác), trong khi site đang tải
// ảnh từ Cloudinary và gọi API GHN/GHTK phía client. Bật CSP ẩu có thể
// làm gãy các phần đó. Muốn bật, nên tự khai domain được phép trước:
//   helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'res.cloudinary.com'], ... } } })
app.use(helmet({ contentSecurityPolicy: false }))

// Middleware
// MỚI: lưu lại raw bytes của body (req.rawBody) song song với việc parse
// JSON như bình thường. Cần thiết riêng cho xác thực chữ ký HMAC-SHA256 của
// SePay — SePay ký trên byte thô của body; nếu chỉ dùng req.body (đã parse)
// rồi JSON.stringify lại, chữ ký sẽ lệch (thứ tự key, khoảng trắng có thể
// khác với bản gốc). Không ảnh hưởng các route khác — chúng vẫn dùng
// req.body như cũ, chỉ riêng route webhook SePay mới cần req.rawBody.
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  },
}))
app.use(passport.initialize()) // B11: Google OAuth (stateless, không dùng session)

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
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)


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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

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

  //dùng http.createServer thay vì app.listen trực tiếp, để gắn được
  // Socket.io lên CÙNG server (cùng port, không cần mở port riêng).
  const httpServer = http.createServer(app)
  initSocket(httpServer)

  httpServer.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
  })

  //Tự động đồng bộ trạng thái đơn hàng từ GHN theo định kỳ (kết hợp
  // với luồng thủ công — khách/admin vẫn bấm "Theo dõi vận chuyển" được như
  // cũ, đây chỉ là thêm 1 lớp tự động chạy nền, không thay thế).
  // Mặc định 10 phút/lần — đủ nhanh để cập nhật kịp thời, vừa tránh gọi GHN
  // quá dồn dập (xem thêm ghi chú rate limit trong autoSyncPendingGHNOrders).
  const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000 // 10 phút

  // Chờ 30 giây sau khi server khởi động rồi mới chạy lần đầu (tránh chạy
  // ngay lúc DB/kết nối vừa mới lên, dễ gây lỗi thoáng qua).
  setTimeout(() => {
    autoSyncPendingGHNOrders().catch((e) =>
      logger.error(`[Auto-sync GHN] Lỗi lần chạy đầu: ${e.message}`)
    )
    //tương tự GHN, nhưng cho đơn giao qua GHTK (ghtkLabelCode). Xem
    // cảnh báo về mapping trạng thái GHTK chưa verify với đơn thật trong
    // ghi chú của GHTK_TO_ORDER_STATUS (orderController.js).
    autoSyncPendingGHTKOrders().catch((e) =>
      logger.error(`[Auto-sync GHTK] Lỗi lần chạy đầu: ${e.message}`)
    )
    setInterval(() => {
      autoSyncPendingGHNOrders().catch((e) =>
        logger.error(`[Auto-sync GHN] Lỗi: ${e.message}`)
      )
      autoSyncPendingGHTKOrders().catch((e) =>
        logger.error(`[Auto-sync GHTK] Lỗi: ${e.message}`)
      )
    }, AUTO_SYNC_INTERVAL_MS)
  }, 30 * 1000)
}

start()