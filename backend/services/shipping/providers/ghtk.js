const GHTK_TIMEOUT_MS = 5000

// ĐÃ SỬA: domain đúng của GHTK là giaohangtietkiem.vn (bản cũ ghi nhầm "ghtkl.vn")
const GHTK_BASE_URL = 'https://services.giaohangtietkiem.vn'

function envTrim(key) {
  return (process.env[key] || '').trim()
}

// MỚI: Khác với GHN (cần mã số Tỉnh/Huyện/Xã do GHN cấp), GHTK nhận thẳng
// TÊN Tỉnh/Huyện dạng chữ (VD: "Hà Nội", "Quận Cầu Giấy") — nên KHÔNG cần
// bước "resolve" ra mã số riêng như ghn.js phải làm. Đơn giản hơn nhiều.
async function getQuotes({ fromAddress, toAddress, totalWeightGrams }) {
  const token = envTrim('GHTK_TOKEN')

  if (!token) {
    console.error('❌ GHTK: thiếu GHTK_TOKEN trong .env')
    return [{ available: false, reason: 'Missing GHTK_TOKEN' }]
  }

  const pickProvince = fromAddress?.province || ''
  const pickDistrict = fromAddress?.district || ''
  const province = toAddress?.province || toAddress?.provinceName || ''
  const district = toAddress?.district || toAddress?.districtName || ''

  if (!pickProvince || !pickDistrict || !province || !district) {
    return [{
      available: false,
      reason: 'Thiếu tên Tỉnh/Huyện (GHTK cần tên chữ — kiểm tra địa chỉ kho hàng và địa chỉ giao)',
    }]
  }

  // GHTK dùng gram cho tham số weight (theo tài liệu chính thức)
  const weight = Math.max(1, Number(totalWeightGrams || 0))

  const params = new URLSearchParams({
    pick_province: pickProvince,
    pick_district: pickDistrict,
    province,
    district,
    weight: String(weight),
  })

  try {
    // ĐÃ SỬA: đây là API GET (bản cũ gọi nhầm POST), tham số nằm trên query string
    const res = await fetch(`${GHTK_BASE_URL}/services/shipment/fee?${params.toString()}`, {
      method: 'GET',
      headers: { Token: token },
    })
    const data = await res.json()

    if (!res.ok || !data?.success || !data?.fee) {
      console.error('❌ GHTK fee error:', data?.message || res.status)
      return [{
        available: false,
        reason: data?.message || `GHTK fee failed (HTTP ${res.status})`,
      }]
    }

    // Tổng phí = phí ship + phí bảo hiểm bắt buộc (theo cấu trúc response thật của GHTK)
    const totalFee = Number(data.fee.fee || 0) + Number(data.fee.insurance_fee || 0)

    return [
      {
        available: true,
        serviceCode: 'ghtk',
        serviceName: 'GHTK',
        fee: totalFee,
        // API tính phí của GHTK không trả về thời gian giao dự kiến (khác GHN),
        // nên để null — ShippingService/frontend đã xử lý an toàn cho trường hợp này.
        etaDate: null,
        meta: {
          areaName: data.fee.name || null,
          deliveryType: data.fee.delivery_type || null,
        },
      },
    ]
  } catch (e) {
    console.error('❌ GHTK fee error:', e.message)
    return [{ available: false, reason: `GHTK fee failed: ${e.message}` }]
  }
}

// ⚠️ LƯU Ý: hàm tra cứu vận đơn (track) của GHTK CHƯA được xác nhận đầy đủ
// theo tài liệu chính thức (chỉ mới sửa domain + bỏ token hardcode cứng).
// Nếu dùng thật, cần test với 1 mã vận đơn GHTK thật và đối chiếu lại cấu
// trúc response trước khi tin tưởng dữ liệu trả về.
async function track(trackingId) {
  const token = envTrim('GHTK_TOKEN')
  if (!token) throw new Error('Missing GHTK_TOKEN')
  if (!trackingId || !String(trackingId).trim()) throw new Error('Missing trackingId')

  const res = await fetch(
    `${GHTK_BASE_URL}/services/shipment/v2/${encodeURIComponent(String(trackingId).trim())}`,
    { method: 'GET', headers: { Token: token } }
  )
  if (!res.ok) throw new Error(`GHTK track: HTTP ${res.status}`)

  const data = await res.json()
  const history = Array.isArray(data?.order?.tracking_history) ? data.order.tracking_history : []

  const events = history.map((h) => ({
    status: String(h?.status_name || ''),
    description: String(h?.status_name || ''),
    location: '',
    time: h?.updated_at || null,
  }))

  return { events, raw: data }
}

export default {
  timeoutMs: GHTK_TIMEOUT_MS,
  getQuotes,
  track,
}