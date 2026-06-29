import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { join } from 'path'

// Load .env bằng đường dẫn tuyệt đối
const envPath = 'C:/CNTT/HariShop_mern/.env'
const result = dotenv.config({ path: envPath })

console.log('📁 ENV path:', envPath)
console.log('📄 dotenv result:', result.error ? '❌ ' + result.error.message : '✅ loaded')
console.log('GMAIL_USER:', process.env.GMAIL_USER || '(rỗng)')
console.log('APP_PASSWORD length:', (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').length)

const GMAIL_USER = (process.env.GMAIL_USER || '').trim()
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('❌ Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong .env')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
})

try {
  const info = await transporter.sendMail({
    from: `"Test" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: 'Test mail',
    text: 'Nếu nhận được cái này thì nodemailer OK!',
  })
  console.log('✅ Sent! Response:', info.response)
} catch (err) {
  console.error('❌ Error:', err.message)
}