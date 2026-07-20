import winston from 'winston'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ══════════════════════════════════════════════════════════════════
// MỚI: logger có cấu trúc (Winston) — thay cho console.log/console.error
// rải rác khắp nơi. Lợi ích so với console.*:
//  - Có MỨC ĐỘ (level: error/warn/info/debug) để lọc khi cần
//  - Ghi ra FILE (logs/error.log, logs/combined.log) — xem lại được lỗi
//    đã xảy ra ngày hôm qua, không chỉ những gì còn trong terminal
//  - Format có timestamp, dễ tra cứu theo thời gian
//
// PHẠM VI: file này chỉ tạo logger dùng chung + áp dụng cho code MỚI viết
// (server.js khởi động, bắt lỗi toàn cục, auto-sync GHN/GHTK...). Codebase
// hiện có ~126 lệnh console.log/error/warn rải rác ở nhiều file khác —
// KHÔNG đổi hết trong 1 lần vì rủi ro thay nhầm cú pháp (nhiều chỗ dùng
// console.log kèm colors.js như `.yellow.bold`, nhiều tham số...). Muốn
// chuyển dần, chỉ cần đổi:
//   console.log(...)   → logger.info(...)
//   console.error(...) → logger.error(...)
//   console.warn(...)  → logger.warn(...)
// ở từng file, từng chỗ một, và test lại sau mỗi lần đổi.
// ══════════════════════════════════════════════════════════════════

const LOG_DIR = path.join(__dirname, '../logs')
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const isDev = process.env.NODE_ENV !== 'production'

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // log(error) tự in kèm stack trace
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`
    })
  ),
  transports: [
    // Ghi TOÀN BỘ log (mọi level) vào 1 file, xoay vòng theo dung lượng để
    // không phình to vô hạn theo thời gian chạy server.
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5MB/file
      maxFiles: 5,
    }),
    // Ghi RIÊNG lỗi (error) vào file khác — dễ tìm khi chỉ cần soát lỗi.
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
})

// Môi trường dev: in thêm ra console (có màu) — giữ trải nghiệm xem log
// trực tiếp khi đang code, giống console.log cũ, chỉ thêm timestamp+level.
if (isDev) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `[${timestamp}] ${level}: ${stack || message}`
        })
      ),
    })
  )
}

export default logger