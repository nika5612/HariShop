import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'
import Voucher from '../models/voucherModel.js'
import { callAI } from '../utils/aiProvider.js'

// ═══════════════════ B2: AI Chatbot tư vấn sản phẩm ═══════════════════
// Kèm theo "catalog" sản phẩm thực tế lấy từ MongoDB tại thời điểm hỏi
// (giá, tồn kho theo màu, specs...) để AI tư vấn chính xác, không bịa sản phẩm.
// Xem cấu hình nhà cung cấp AI (Anthropic/OpenAI-compatible) tại backend/utils/aiProvider.js

const MAX_CATALOG_PRODUCTS = 150   // tránh prompt quá dài nếu shop có rất nhiều sản phẩm
const MAX_HISTORY_MESSAGES = 16    // chỉ giữ lại N tin nhắn gần nhất để tiết kiệm token
const MAX_MESSAGE_LENGTH = 1000    // chặn spam tin nhắn quá dài

// ── Rate limit đơn giản theo IP (tránh spam gọi API tốn phí) ──
const chatRateLimitMap = new Map()
const CHAT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 phút
const CHAT_RATE_LIMIT_MAX = 30 // tối đa 30 tin nhắn / 10 phút / IP

const checkChatRateLimit = (ip) => {
  const now = Date.now()
  const record = chatRateLimitMap.get(ip) || { count: 0, resetTime: now + CHAT_RATE_LIMIT_WINDOW_MS }

  if (now > record.resetTime) {
    chatRateLimitMap.set(ip, { count: 1, resetTime: now + CHAT_RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (record.count >= CHAT_RATE_LIMIT_MAX) return false

  record.count += 1
  chatRateLimitMap.set(ip, record)
  return true
}

// Chuẩn hoá đơn vị RAM/dung lượng về GB — để AI không cần tự quy đổi TB→GB khi so sánh
// giữa các sản phẩm dùng đơn vị khác nhau (vd "512GB" vs "1TB"), tránh model yếu so sánh sai.
const normalizeUnitHint = (str) => {
  if (!str) return ''
  const match = String(str).match(/([\d.]+)\s*TB/i)
  if (!match) return ''
  const gb = Math.round(parseFloat(match[1]) * 1024)
  return ` (~${gb}GB)`
}

// ── Format 1 sản phẩm thành 1 khối text ngắn gọn cho system prompt ──
const formatProductForPrompt = (p) => {
  const lines = []
  lines.push(`- id:${p._id} | ${p.name} | ${p.brand} | ${p.category} | Giá: ${Number(p.price).toLocaleString('vi-VN')}đ`)

  if (Array.isArray(p.colors) && p.colors.length > 0) {
    const stockText = p.colors
      .map((c) => `${c.name} (${c.countInStock > 0 ? `còn ${c.countInStock}` : 'hết hàng'})`)
      .join(', ')
    lines.push(`  Màu/Tồn kho: ${stockText}`)
  } else {
    lines.push(`  Tồn kho: ${p.countInStock > 0 ? `còn ${p.countInStock}` : 'hết hàng'}`)
  }

  const s = p.specs || {}
  const specParts = []
  if (s.ram) specParts.push(`RAM ${s.ram}${normalizeUnitHint(s.ram)}`)
  if (s.storage) specParts.push(`Bộ nhớ ${s.storage}${normalizeUnitHint(s.storage)}`)
  if (s.battery) specParts.push(`Pin ${s.battery}mAh`)
  if (s.screenSize || s.screenType) specParts.push(`Màn hình ${[s.screenSize, s.screenType].filter(Boolean).join(' ')}`)
  if (s.camera) specParts.push(`Camera sau ${s.camera}`)
  if (s.cameraFront) specParts.push(`Camera trước ${s.cameraFront}`)
  if (s.chip) specParts.push(`Chip ${s.chip}`)
  if (s.os) specParts.push(`HĐH ${s.os}`)
  if (specParts.length > 0) lines.push(`  Thông số: ${specParts.join(' | ')}`)

  if (p.rating > 0) lines.push(`  Đánh giá: ${p.rating}/5 (${p.numReviews} lượt)`)

  return lines.join('\n')
}

// ── Format 1 voucher đang còn hiệu lực thành text ngắn gọn cho system prompt ──
const formatVoucherForPrompt = (v) => {
  const discountText = v.type === 'percent'
    ? `giảm ${v.value}%${v.maxDiscount > 0 ? ` (tối đa ${Number(v.maxDiscount).toLocaleString('vi-VN')}đ)` : ''}`
    : `giảm ${Number(v.value).toLocaleString('vi-VN')}đ`
  const minOrderText = v.minOrder > 0 ? `, đơn tối thiểu ${Number(v.minOrder).toLocaleString('vi-VN')}đ` : ''
  const expiryText = v.expiresAt ? `, hạn dùng đến ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : ''
  return `- Mã "${v.code}": ${discountText}${minOrderText}${expiryText}`
}

const buildSystemPrompt = (catalogText, voucherText, userName) => `
Bạn là trợ lý tư vấn bán hàng AI của HariShop — cửa hàng chuyên bán điện thoại thông minh.
${userName ? `Khách hàng đang trò chuyện tên là "${userName}".` : ''}

QUY TẮC BẮT BUỘC:
1. CHỈ được tư vấn, nhắc đến sản phẩm có trong DANH SÁCH SẢN PHẨM bên dưới. Tuyệt đối không bịa ra sản phẩm, giá, hoặc thông số không có trong danh sách.
2. Luôn trả lời bằng tiếng Việt, giọng thân thiện, ngắn gọn (khoảng 2-5 câu), đi thẳng vào trọng tâm.
3. Khi khách hỏi theo ngân sách/nhu cầu, hãy lọc và gợi ý 1-3 sản phẩm phù hợp nhất, giải thích ngắn gọn lý do (giá, pin, camera, hiệu năng...).
4. Nếu sản phẩm khách muốn hết hàng ở màu nào đó, hãy nói rõ và gợi ý màu còn hàng khác nếu có.
5. Nếu không có sản phẩm nào phù hợp trong danh sách, hãy thành thật nói không có và gợi ý lựa chọn gần nhất.
6. Nếu khách hỏi ngoài chủ đề mua sắm/sản phẩm (thời tiết, chính trị, chuyện phiếm...), lịch sự từ chối và mời khách quay lại chủ đề mua điện thoại.
7. Nếu khách hỏi về mã giảm giá/voucher/khuyến mãi, CHỈ được nhắc đến các mã có trong DANH SÁCH MÃ GIẢM GIÁ bên dưới (nếu danh sách rỗng thì nói hiện chưa có mã nào đang áp dụng). Tuyệt đối không bịa ra mã giảm giá không có thật.
8. QUAN TRỌNG: Nếu trong câu trả lời bạn có gợi ý cụ thể sản phẩm nào (tối đa 3 sản phẩm), PHẢI thêm một dòng DUY NHẤT ở cuối cùng, đúng định dạng:
///SUGGEST:<id1>,<id2>,<id3>///
   (dùng đúng "id" ghi trong danh sách sản phẩm, phân cách bằng dấu phẩy, không khoảng trắng). Nếu không gợi ý sản phẩm cụ thể nào thì KHÔNG thêm dòng này.
9. CỰC KỲ QUAN TRỌNG: CHỈ xuất ra CÂU TRẢ LỜI CUỐI CÙNG dành cho khách hàng. TUYỆT ĐỐI KHÔNG được viết ra quá trình suy nghĩ, phân tích, lập luận từng bước, không dùng các cụm như "we need to", "let's", "I need to", "first,", "so the user", "step by step". Không được xen tiếng Anh vào câu trả lời (trừ tên thương hiệu/model sản phẩm). Không lặp lại câu hỏi của khách, không giải thích bạn đang làm gì — chỉ đưa thẳng câu trả lời.

DANH SÁCH SẢN PHẨM HIỆN CÓ (dữ liệu thực tế, cập nhật tại thời điểm này):
${catalogText}

DANH SÁCH MÃ GIẢM GIÁ ĐANG HIỆU LỰC (dữ liệu thực tế, cập nhật tại thời điểm này):
${voucherText}
`.trim()

// Trích xuất & xoá dòng ///SUGGEST:id1,id2///  khỏi text hiển thị cho khách
const SUGGEST_REGEX = /\/\/\/SUGGEST:([a-fA-F0-9,]+)\/\/\/\s*$/

const extractSuggestions = (text) => {
  const match = text.match(SUGGEST_REGEX)
  if (!match) return { cleanText: text.trim(), ids: [] }

  const ids = match[1].split(',').map((s) => s.trim()).filter(Boolean)
  const cleanText = text.replace(SUGGEST_REGEX, '').trim()
  return { cleanText, ids }
}

// @desc    Chat với AI tư vấn sản phẩm (B2)
// @route   POST /api/chat
// @access  Public
const chatWithAI = asyncHandler(async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  if (!checkChatRateLimit(ip)) {
    res.status(429)
    throw new Error('Bạn đã gửi quá nhiều tin nhắn, vui lòng thử lại sau ít phút.')
  }

  const { messages, userName } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400)
    throw new Error('Thiếu nội dung hội thoại.')
  }

  // Chuẩn hoá + giới hạn lịch sử hội thoại gửi lên AI (tiết kiệm token, chặn spam)
  const sanitizedHistory = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
    }))

  if (sanitizedHistory.length === 0) {
    res.status(400)
    throw new Error('Nội dung tin nhắn không hợp lệ.')
  }

  // Lấy catalog sản phẩm thực tế từ MongoDB
  const products = await Product.find({})
    .select('name brand category price countInStock colors specs rating numReviews')
    .sort({ createdAt: -1 })
    .limit(MAX_CATALOG_PRODUCTS)
    .lean()

  const catalogText = products.length > 0
    ? products.map(formatProductForPrompt).join('\n')
    : '(Hiện shop chưa có sản phẩm nào trong hệ thống)'

  const validProductIds = new Set(products.map((p) => p._id.toString()))

  // Lấy danh sách voucher đang còn hiệu lực (isActive, chưa hết hạn, đã tới ngày bắt đầu, chưa hết lượt dùng)
  const now = new Date()
  const activeVouchers = await Voucher.find({
    isActive: true,
    expiresAt: { $gte: now },
    $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
  }).lean()

  const validVouchers = activeVouchers.filter((v) => v.usageLimit === 0 || v.usedCount < v.usageLimit)

  const voucherText = validVouchers.length > 0
    ? validVouchers.map(formatVoucherForPrompt).join('\n')
    : '(Hiện không có mã giảm giá nào đang áp dụng)'

  const systemPrompt = buildSystemPrompt(catalogText, voucherText, (userName || '').toString().slice(0, 60))

  let rawText
  try {
    rawText = await callAI(systemPrompt, sanitizedHistory, { maxTokens: 700 })
  } catch (err) {
    res.status(err.statusCode || 502)
    throw err
  }

  const { cleanText, ids } = extractSuggestions(rawText)

  // Chỉ giữ lại id thật sự tồn tại trong catalog (chặn AI hallucinate id lạ), tối đa 3
  const validIds = ids.filter((id) => validProductIds.has(id)).slice(0, 3)

  let suggestions = []
  if (validIds.length > 0) {
    const suggestedProducts = await Product.find({ _id: { $in: validIds } })
      .select('name image price countInStock colors')
      .lean()
    // Giữ đúng thứ tự AI đã gợi ý
    suggestions = validIds
      .map((id) => suggestedProducts.find((p) => p._id.toString() === id))
      .filter(Boolean)
  }

  res.json({ reply: cleanText, suggestions })
})

export { chatWithAI }