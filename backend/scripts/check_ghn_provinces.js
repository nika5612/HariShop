import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Tự tìm đường dẫn .env ở thư mục gốc project (giống cách server.js làm),
// không cần sửa đường dẫn tay như file test-mail.js cũ.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env') })

const USE_SANDBOX = (process.env.GHN_USE_SANDBOX || '').trim().toLowerCase() === 'true'
const BASE_URL = USE_SANDBOX
  ? 'https://dev-online-gateway.ghn.vn/shiip/public-api'
  : 'https://online-gateway.ghn.vn/shiip/public-api'
const TOKEN = USE_SANDBOX
  ? (process.env.GHN_TOKEN_DEV || '').trim()
  : (process.env.GHN_TOKEN || '').trim()

console.log('=== Kiểm tra dữ liệu GHN hiện tại (sau sáp nhập tỉnh) ===')
console.log('Chế độ:', USE_SANDBOX ? 'SANDBOX' : 'PRODUCTION')
console.log('Token:', TOKEN ? TOKEN.slice(0, 6) + '...' : '❌ KHÔNG CÓ - kiểm tra lại .env')
console.log('')

if (!TOKEN) {
  console.log('❌ Không tìm thấy token GHN trong .env, dừng lại.')
  process.exit(1)
}

async function ghnGet(pathUrl) {
  const res = await fetch(`${BASE_URL}${pathUrl}`, {
    method: 'GET',
    headers: { token: TOKEN, 'Content-Type': 'application/json' },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json
}

async function ghnPost(pathUrl, body) {
  const res = await fetch(`${BASE_URL}${pathUrl}`, {
    method: 'POST',
    headers: { token: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json
}

async function main() {
  try {
    // 1) Lấy toàn bộ danh sách tỉnh
    const provinceRes = await ghnGet('/master-data/province')
    const provinces = provinceRes?.data || []
    console.log(`✅ Tổng số tỉnh/thành GHN trả về: ${provinces.length}`)
    console.log('   (Nếu 63 → GHN CHƯA cập nhật sáp nhập. Nếu ~34 → GHN ĐÃ cập nhật.)')
    console.log('')

    // 2) Tìm tỉnh có tên chứa "Tây Ninh" hoặc "Long An" để so sánh
    const matches = provinces.filter((p) =>
      (p.ProvinceName || '').includes('Tây Ninh') || (p.ProvinceName || '').includes('Long An')
    )
    console.log('🔍 Các tỉnh khớp "Tây Ninh"/"Long An":')
    matches.forEach((p) => console.log(`   - ProvinceID=${p.ProvinceID} | ${p.ProvinceName}`))
    console.log('')

    if (matches.length === 0) {
      console.log('⚠️ Không tìm thấy tỉnh nào tên chứa "Tây Ninh"/"Long An" — in thử 10 tỉnh đầu để kiểm tra tên gọi:')
      provinces.slice(0, 10).forEach((p) => console.log(`   - ProvinceID=${p.ProvinceID} | ${p.ProvinceName}`))
      return
    }

    // 3) Với tỉnh đầu tiên khớp được, lấy danh sách huyện của tỉnh đó
    const target = matches[0]
    const districtRes = await ghnPost('/master-data/district', { province_id: target.ProvinceID })
    const districts = districtRes?.data || []
    console.log(`✅ Tỉnh "${target.ProvinceName}" (ID=${target.ProvinceID}) có ${districts.length} huyện/quận:`)
    districts.slice(0, 15).forEach((d) => console.log(`   - DistrictID=${d.DistrictID} | ${d.DistrictName}`))
    if (districts.length > 15) console.log(`   ... và ${districts.length - 15} huyện khác`)
  } catch (err) {
    console.log('❌ Lỗi khi gọi API GHN:', err.message)
  }
}

main()