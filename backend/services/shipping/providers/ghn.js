const GHN_TIMEOUT_MS = 8000

// ĐÃ SỬA: KHÔNG được tính USE_SANDBOX/GHN_BASE_URL là `const` ở top-level.
// Lý do: ES Modules nạp toàn bộ `import` (kể cả file này) TRƯỚC khi
// dotenv.config() chạy trong server.js — nên nếu tính ngay lúc import,
// process.env.GHN_USE_SANDBOX luôn là undefined, và giá trị `false` bị
// "đóng băng" vĩnh viễn dù .env có ghi true. Phải bọc trong hàm, gọi lại
// mỗi lần cần dùng (giống cách đã sửa configureCloudinary/configureGoogleStrategy).
function isSandbox() {
  return (process.env.GHN_USE_SANDBOX || '').trim() === 'true'
}
function getGhnBaseUrl() {
  return isSandbox()
    ? 'https://dev-online-gateway.ghn.vn/shiip/public-api'
    : 'https://online-gateway.ghn.vn/shiip/public-api'
}

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
    else {
      const max = Math.min(name.length, target.length)
      let common = 0
      for (let i = 0; i < max; i++) {
        if (name[i] !== target[i]) break
        common++
      }
      score = Math.min(60, common)
    }

    if (score > bestScore) {
      bestScore = score
      best = it
    }
  }
  return best
}

async function ghnFetchJson(path, { token, shopId, method = 'POST', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Token: token,
  }
  if (shopId) headers.ShopId = String(shopId)

  const res = await fetch(`${getGhnBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || (data && typeof data === 'object' && data.code && Number(data.code) !== 200)) {
    const msg = data?.message || `GHN request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

async function resolveProvinceId({ token, provinceName, provinceId }) {
  const explicit = Number(provinceId || 0)
  if (explicit) return explicit
  if (!provinceName) return 0

  const res = await ghnFetchJson('/master-data/province', { token, method: 'GET' })
  const list = Array.isArray(res?.data) ? res.data : []
  const best = pickBestByName(list, (p) => p?.ProvinceName, provinceName)
  return Number(best?.ProvinceID || 0)
}

async function resolveDistrictId({ token, provinceId, districtName, districtId }) {
  const explicit = Number(districtId || 0)
  if (explicit) return explicit
  if (!provinceId || !districtName) return 0

  const res = await ghnFetchJson('/master-data/district', {
    token,
    method: 'POST',
    body: { province_id: Number(provinceId) },
  })
  const list = Array.isArray(res?.data) ? res.data : []
  const best = pickBestByName(list, (d) => d?.DistrictName, districtName)
  return Number(best?.DistrictID || 0)
}

async function resolveWardCode({ token, districtId, wardName, wardCode }) {
  const explicit = String(wardCode || '').trim()
  if (explicit) return explicit
  if (!districtId || !wardName) return ''

  const res = await ghnFetchJson(`/master-data/ward?district_id=${Number(districtId)}`, {
    token,
    method: 'GET',
  })
  const list = Array.isArray(res?.data) ? res.data : []
  const best = pickBestByName(list, (w) => w?.WardName, wardName)
  return String(best?.WardCode || '').trim()
}

async function getQuotes({ toAddress, fromAddress, totalWeightGrams, cartItems }) {
  const token = isSandbox()
    ? envFirstTrim(['GHN_TOKEN_DEV'])
    : envFirstTrim(['GHN_TOKEN', 'TOKEN_GHN'])
  const shopId = isSandbox()
    ? envFirstTrim(['GHN_SHOP_ID_DEV'])
    : envFirstTrim(['GHN_SHOP_ID', 'ID_GHN'])

  if (!token || !shopId) {
    console.error('❌ GHN: thiếu GHN_TOKEN/GHN_SHOP_ID (hoặc TOKEN_GHN/ID_GHN)')
    return [{ available: false, reason: 'Missing GHN_TOKEN/GHN_SHOP_ID (or TOKEN_GHN/ID_GHN)' }]
  }

  const weight = Math.max(1, Number(totalWeightGrams || 0))

  const provinceName = toAddress?.province || toAddress?.provinceName
  const districtName = toAddress?.district || toAddress?.districtName
  const wardName = toAddress?.ward || toAddress?.wardName

  const provinceId = await resolveProvinceId({
    token,
    provinceName,
    provinceId: toAddress?.provinceId,
  })
  const toDistrictId = await resolveDistrictId({
    token,
    provinceId,
    districtName,
    districtId: toAddress?.districtId,
  })
  const toWardCode = await resolveWardCode({
    token,
    districtId: toDistrictId,
    wardName,
    wardCode: toAddress?.wardCode,
  })

  if (!toDistrictId || !toWardCode) {
    console.error('❌ GHN: không map được district/ward cho địa chỉ nhận hàng')
    return [{ available: false, reason: 'Không map được GHN district/ward.' }]
  }

  let fromDistrictId = 0
  let fromWardCode = ''

  const warehouse = fromAddress && typeof fromAddress === 'object' ? fromAddress : null

  if (warehouse) {
    fromDistrictId = Number(warehouse?.ghnDistrictId || warehouse?.districtId || 0)
    fromWardCode = String(warehouse?.ghnWardCode || warehouse?.wardCode || '').trim()

    if (!fromDistrictId || !fromWardCode) {
      const fromProvinceId = await resolveProvinceId({
        token,
        provinceName: warehouse?.province,
        provinceId: warehouse?.provinceId,
      })
      fromDistrictId =
        fromDistrictId ||
        (await resolveDistrictId({
          token,
          provinceId: fromProvinceId,
          districtName: warehouse?.district,
          districtId: warehouse?.districtId,
        }))
      fromWardCode =
        fromWardCode ||
        (await resolveWardCode({
          token,
          districtId: fromDistrictId,
          wardName: warehouse?.ward,
          wardCode: warehouse?.wardCode,
        }))
    }
  }

  if (!fromDistrictId) fromDistrictId = Number(envFirstTrim(['GHN_FROM_DISTRICT_ID']) || 0)
  if (!fromWardCode) fromWardCode = envFirstTrim(['GHN_FROM_WARD_CODE'])

  // 1) available services
  let services = []
  if (fromDistrictId) {
    try {
      const svcRes = await ghnFetchJson('/v2/shipping-order/available-services', {
        token,
        method: 'POST',
        body: {
          shop_id: Number(shopId),
          from_district: fromDistrictId,
          to_district: toDistrictId,
        },
      })
      services = Array.isArray(svcRes?.data) ? svcRes.data : []
    } catch (e) {
      console.error('⚠️ GHN available-services error (non-fatal):', e.message)
      services = []
    }
  }

  // 2) fee calculation
  let feeRes
  try {
    feeRes = await ghnFetchJson('/v2/shipping-order/fee', {
      token,
      shopId,
      method: 'POST',
      body: {
        service_type_id: 2,
        from_district_id: fromDistrictId || undefined,
        from_ward_code: fromWardCode || undefined,
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        weight,
        insurance_value: 0,
        coupon: null,
        items: (Array.isArray(cartItems) ? cartItems : []).slice(0, 50).map((it) => ({
          name: String(it?.name || 'Item'),
          code: String(it?.product || ''),
          quantity: Number(it?.qty || 1),
          height: Number(it?.height || 0) || 10,
          weight: Number(it?.weight || 0) || Math.max(1, Math.round(weight / Math.max(1, cartItems?.length || 1))),
          width: Number(it?.width || 0) || 10,
          length: Number(it?.length || 0) || 10,
        })),
      },
    })
  } catch (e) {
    console.error('❌ GHN fee error:', e.message)
    return [{ available: false, reason: `GHN fee failed: ${e.message}` }]
  }

  const totalFee = Number(feeRes?.data?.total || feeRes?.data?.service_fee || 0)

  // 3) leadtime
  let etaDate = null
  if (fromDistrictId && fromWardCode && services.length > 0) {
    const serviceId = Number(services[0]?.service_id || 0)
    if (serviceId) {
      try {
        const leadRes = await ghnFetchJson('/v2/shipping-order/leadtime', {
          token,
          shopId,
          method: 'POST',
          body: {
            from_district_id: fromDistrictId,
            from_ward_code: fromWardCode,
            to_district_id: toDistrictId,
            to_ward_code: toWardCode,
            service_id: serviceId,
          },
        })
        const leadSec = Number(leadRes?.data?.leadtime || 0)
        if (leadSec) etaDate = new Date(leadSec * 1000).toISOString()
      } catch (e) {
        console.error('⚠️ GHN leadtime error (non-fatal):', e.message)
        etaDate = null
      }
    }
  }

  const primaryService = services[0]
  return [
    {
      available: true,
      serviceCode: String(primaryService?.service_id || 'fee'),
      serviceName: primaryService?.short_name || 'GHN',
      fee: totalFee,
      etaDate,
      meta: {
        toDistrictId,
        toWardCode,
        fromDistrictId: fromDistrictId || null,
        fromWardCode: fromWardCode || null,
      },
    },
  ]
}

async function track(trackingId) {
  const token = isSandbox()
    ? envFirstTrim(['GHN_TOKEN_DEV'])
    : envFirstTrim(['GHN_TOKEN', 'TOKEN_GHN'])

  if (!token) throw new Error('Missing GHN token')
  if (!trackingId || !String(trackingId).trim()) throw new Error('Missing trackingId')

  const res = await ghnFetchJson('/v2/shipping-order/detail', {
    token,
    method: 'POST',
    body: { order_code: String(trackingId).trim() },
  })

  const order = Array.isArray(res?.data) ? res.data[0] : res?.data
  const log = Array.isArray(order?.log) ? order.log : []

  const events = log.map((l) => ({
    status: String(l?.status || ''),
    description: String(l?.status || ''),
    location: '',
    time: l?.updated_date ? new Date(l.updated_date).toISOString() : null,
  }))

  return { events, raw: order || res?.data || null }
}

export default { timeoutMs: GHN_TIMEOUT_MS, getQuotes, track }