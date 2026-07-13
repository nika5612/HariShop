import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'
import { callAI } from '../utils/aiProvider.js'

// ═══════════════════ B3: Tìm kiếm bằng ngôn ngữ tự nhiên ═══════════════════
// Khách gõ 1 câu tự nhiên (có thể sai chính tả/viết tắt/không dấu), AI phân tích
// thành các tiêu chí có cấu trúc (brand, category, giá, màu, sắp xếp...), sau đó
// hệ thống tự chạy MongoDB query với các tiêu chí đó — KHÔNG thay thế thanh tìm
// kiếm từ khoá hiện có, mà chạy song song như một lựa chọn bổ sung.

const PAGE_SIZE = 12
const MAX_QUERY_LENGTH = 300

// ── Rate limit đơn giản theo IP (tránh spam gọi API tốn phí) ──
const searchRateLimitMap = new Map()
const SEARCH_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 phút
const SEARCH_RATE_LIMIT_MAX = 30 // tối đa 30 lượt tìm / 10 phút / IP

const checkSearchRateLimit = (ip) => {
  const now = Date.now()
  const record = searchRateLimitMap.get(ip) || { count: 0, resetTime: now + SEARCH_RATE_LIMIT_WINDOW_MS }

  if (now > record.resetTime) {
    searchRateLimitMap.set(ip, { count: 1, resetTime: now + SEARCH_RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (record.count >= SEARCH_RATE_LIMIT_MAX) return false

  record.count += 1
  searchRateLimitMap.set(ip, record)
  return true
}

// Thoát ký tự đặc biệt trước khi đưa vào $regex, tránh lỗi/khai thác regex
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildSearchSystemPrompt = (brands, categories) => `
Bạn là bộ máy phân tích câu tìm kiếm tự nhiên cho website bán điện thoại HariShop.
Khách gõ 1 câu tìm kiếm bằng tiếng Việt (có thể sai chính tả, viết tắt, không dấu, thiếu dấu cách).
Nhiệm vụ của bạn: phân tích và trả về DUY NHẤT 1 object JSON hợp lệ, KHÔNG kèm bất kỳ chữ nào khác,
KHÔNG dùng markdown/code fence (không có \`\`\`), đúng cấu trúc sau:

{
  "brand": string | null,
  "category": string | null,
  "keyword": string | null,
  "color": string | null,
  "minPrice": number | null,
  "maxPrice": number | null,
  "sortBy": "priceAsc" | "priceDesc" | "latest" | "batteryDesc" | null,
  "inStockOnly": boolean
}

Giải thích từng trường:
- "brand": PHẢI chọn đúng NGUYÊN VĂN 1 giá trị trong DANH SÁCH BRAND HỢP LỆ bên dưới — chọn giá trị GẦN ĐÚNG NHẤT
  nếu khách gõ sai chính tả/viết tắt/không dấu (ví dụ "iphan", "ifan", "aiphone", "iphone" đều nghĩa là brand "Apple"
  nếu "Apple" có trong danh sách; "samsang", "sam sung" là "Samsung"). Nếu không xác định được thì null.
- "category": tương tự "brand" nhưng chọn từ DANH SÁCH CATEGORY HỢP LỆ. Nếu không đề cập thì null.
- "keyword": CHỈ điền khi khách nhắc tên/dòng máy cụ thể (vd "iPhone 16 Pro Max", "Galaxy S25 Ultra"), viết lại
  cho đúng chính tả chuẩn. Nếu khách chỉ hỏi chung chung (không nhắc dòng máy cụ thể) thì null.
- "color": màu sắc mong muốn (tiếng Việt, vd "xanh", "đen", "trắng", "tím", "vàng"). null nếu không đề cập.
- "minPrice"/"maxPrice": đơn vị VNĐ (số nguyên, KHÔNG có dấu chấm/phẩy). Quy đổi: "15 triệu" → 15000000,
  "dưới 500k" → maxPrice=500000, "trên 10tr" → minPrice=10000000, "từ 5-10 triệu" → minPrice=5000000, maxPrice=10000000.
  null nếu không đề cập.
- "sortBy": "priceAsc" nếu muốn giá rẻ nhất/thấp nhất trước; "priceDesc" nếu muốn đắt nhất/cao cấp nhất trước;
  "batteryDesc" nếu hỏi về pin tốt/pin trâu/pin khủng nhất; "latest" nếu hỏi máy mới nhất/mới ra mắt. null nếu không rõ.
- "inStockOnly": true nếu khách hỏi rõ "còn hàng không"/"còn hàng", ngược lại false.

DANH SÁCH BRAND HỢP LỆ: ${brands.length > 0 ? brands.join(', ') : '(chưa có brand nào trong hệ thống)'}
DANH SÁCH CATEGORY HỢP LỆ: ${categories.length > 0 ? categories.join(', ') : '(chưa có category nào trong hệ thống)'}

QUY TẮC BẮT BUỘC:
- CHỈ trả về JSON thuần, không thêm lời giải thích, không suy luận ra ngoài, không dùng \`\`\`.
- "brand"/"category" PHẢI lấy đúng nguyên văn từ 2 danh sách trên, tuyệt đối không tự bịa giá trị không có trong danh sách.
- Nếu câu tìm kiếm không liên quan gì đến điện thoại/mua sắm, trả về toàn bộ giá trị null và "inStockOnly": false.
`.trim()

// Chọn giá trị khớp gần nhất (không phân biệt hoa/thường) với 1 phần tử trong danh sách hợp lệ.
// Trả về đúng giá trị NGUYÊN VĂN trong danh sách (đúng hoa/thường như trong DB), hoặc null nếu không khớp.
const matchValidValue = (value, validList) => {
  if (!value || typeof value !== 'string') return null
  const found = validList.find((v) => v.toLowerCase() === value.trim().toLowerCase())
  return found || null
}

const VALID_SORT_OPTIONS = ['priceAsc', 'priceDesc', 'latest', 'batteryDesc']

// @desc    Phân tích câu tìm kiếm tự nhiên bằng AI rồi trả về sản phẩm khớp (B3)
// @route   POST /api/products/nl-search
// @access  Public
const naturalLanguageSearch = asyncHandler(async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  if (!checkSearchRateLimit(ip)) {
    res.status(429)
    throw new Error('Bạn đã tìm kiếm quá nhiều lần, vui lòng thử lại sau ít phút.')
  }

  const rawQuery = (req.body?.query || '').toString().trim().slice(0, MAX_QUERY_LENGTH)
  if (!rawQuery) {
    res.status(400)
    throw new Error('Vui lòng nhập nội dung tìm kiếm.')
  }

  const page = Number(req.body?.pageNumber) || 1
  if (isNaN(page) || page < 1) {
    res.status(400)
    throw new Error('Số trang không hợp lệ.')
  }

  // Lấy danh sách brand/category thật đang có trong DB để AI chọn đúng, tránh bịa
  const [brands, categories] = await Promise.all([
    Product.distinct('brand'),
    Product.distinct('category'),
  ])

  const systemPrompt = buildSearchSystemPrompt(
    brands.filter(Boolean),
    categories.filter(Boolean)
  )

  const callAndParse = async () => {
    const text = await callAI(systemPrompt, [{ role: 'user', content: rawQuery }], { maxTokens: 700, checkLeak: false })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) // ném lỗi nếu không parse được
  }

  let parsed
  try {
    try {
      parsed = await callAndParse()
    } catch (parseErr) {
      // JSON lỗi/bị cắt cụt (hay gặp với model "reasoning" free) — thử lại 1 lần trước khi báo lỗi
      console.warn('⚠️ JSON từ AI không hợp lệ, đang thử lại (B3)...')
      parsed = await callAndParse()
    }
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode)
      throw err
    }
    console.error('❌ Không parse được JSON từ AI sau khi thử lại (B3):', err.message)
    res.status(502)
    throw new Error('AI không phân tích được câu tìm kiếm này. Vui lòng thử diễn đạt khác hoặc dùng ô tìm kiếm thường.')
  }

  // ── Xác thực & chuẩn hoá từng trường (không tin tưởng AI 100%) ──
  const brand = matchValidValue(parsed.brand, brands)
  const category = matchValidValue(parsed.category, categories)
  const keyword = typeof parsed.keyword === 'string' && parsed.keyword.trim() ? parsed.keyword.trim().slice(0, 100) : ''
  const color = typeof parsed.color === 'string' && parsed.color.trim() ? parsed.color.trim().slice(0, 40) : ''
  const minPrice = Number.isFinite(Number(parsed.minPrice)) && parsed.minPrice !== null ? Number(parsed.minPrice) : null
  const maxPrice = Number.isFinite(Number(parsed.maxPrice)) && parsed.maxPrice !== null ? Number(parsed.maxPrice) : null
  const sortBy = VALID_SORT_OPTIONS.includes(parsed.sortBy) ? parsed.sortBy : 'latest'
  const inStockOnly = parsed.inStockOnly === true

  // ── Build MongoDB filter từ các tiêu chí đã xác thực ──
  const filter = {}
  if (keyword) filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
  if (brand) filter.brand = { $regex: `^${escapeRegex(brand)}$`, $options: 'i' }
  if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
  if (color) filter['colors.name'] = { $regex: escapeRegex(color), $options: 'i' }
  if (minPrice !== null || maxPrice !== null) {
    filter.price = {}
    if (minPrice !== null) filter.price.$gte = minPrice
    if (maxPrice !== null) filter.price.$lte = maxPrice
  }
  if (inStockOnly) {
    filter.$or = [{ countInStock: { $gt: 0 } }, { 'colors.countInStock': { $gt: 0 } }]
  }

  let sortOption = { createdAt: -1 }
  switch (sortBy) {
    case 'priceAsc':    sortOption = { price: 1 };            break
    case 'priceDesc':   sortOption = { price: -1 };           break
    case 'batteryDesc': sortOption = { 'specs.battery': -1 }; break
    case 'latest':      sortOption = { createdAt: -1 };       break
  }

  const [totalCount, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sortOption)
      .limit(PAGE_SIZE)
      .skip(PAGE_SIZE * (page - 1))
      .lean(),
  ])

  // ── Tóm tắt tiêu chí AI đã hiểu, để Frontend hiển thị thành chip cho khách xem lại ──
  const understood = []
  if (keyword) understood.push(`Từ khoá: "${keyword}"`)
  if (brand) understood.push(`Hãng: ${brand}`)
  if (category) understood.push(`Danh mục: ${category}`)
  if (color) understood.push(`Màu: ${color}`)
  if (minPrice !== null && maxPrice !== null) understood.push(`Giá: ${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ`)
  else if (maxPrice !== null) understood.push(`Giá: dưới ${maxPrice.toLocaleString('vi-VN')}đ`)
  else if (minPrice !== null) understood.push(`Giá: trên ${minPrice.toLocaleString('vi-VN')}đ`)
  if (sortBy === 'priceAsc') understood.push('Sắp xếp: giá thấp → cao')
  if (sortBy === 'priceDesc') understood.push('Sắp xếp: giá cao → thấp')
  if (sortBy === 'batteryDesc') understood.push('Sắp xếp: pin cao nhất')
  if (inStockOnly) understood.push('Chỉ hàng còn kho')

  res.json({
    success: true,
    query: rawQuery,
    filters: { brand, category, keyword, color, minPrice, maxPrice, sortBy, inStockOnly },
    understood, // mảng string ngắn gọn để hiển thị chip
    products: products || [],
    page,
    pages: Math.ceil(totalCount / PAGE_SIZE) || 1,
    totalCount: totalCount || 0,
  })
})

export { naturalLanguageSearch }