// ═══════════════════ AI Provider dùng chung (B2 chatbot + B3 tìm kiếm tự nhiên) ═══════════════════
// Gọi 1 trong 2 dạng API để lấy phản hồi AI:
//   - "anthropic"      → Anthropic Messages API (Claude)
//   - "openai"         → OpenAI Chat Completions API (chuẩn "OpenAI-compatible")
//     dùng được cho: OpenAI thật, OpenRouter (nhiều model MIỄN PHÍ), Groq,
//     DeepSeek, Together AI, hoặc Ollama chạy local — chỉ cần đổi biến môi trường,
//     KHÔNG cần sửa code.
//
// ── Cấu hình nhà cung cấp AI qua biến môi trường (.env) ──
// CHAT_PROVIDER=anthropic (mặc định nếu có ANTHROPIC_API_KEY) hoặc =openai
//
// Dùng Anthropic (Claude):
//   ANTHROPIC_API_KEY=sk-ant-...
//   ANTHROPIC_MODEL=claude-sonnet-4-5          (tuỳ chọn)
//
// Dùng OpenAI / OpenRouter / Groq / DeepSeek / Ollama (chuẩn OpenAI-compatible):
//   CHAT_PROVIDER=openai
//   OPENAI_API_KEY=<api key của nhà cung cấp>
//   OPENAI_BASE_URL=https://api.openai.com/v1  (đổi tuỳ nhà cung cấp, xem bảng bên dưới)
//   OPENAI_MODEL=gpt-4o-mini                    (đổi tuỳ nhà cung cấp)
//
// Bảng OPENAI_BASE_URL tham khảo cho từng nhà cung cấp (đều theo chuẩn OpenAI):
//   OpenAI      → https://api.openai.com/v1
//   OpenRouter  → https://openrouter.ai/api/v1   (có nhiều model MIỄN PHÍ, vd: "openrouter/free")
//   Groq        → https://api.groq.com/openai/v1 (rất nhanh, có free tier)
//   DeepSeek    → https://api.deepseek.com/v1
//   Ollama local→ http://localhost:11434/v1      (chạy model miễn phí trên máy, OPENAI_API_KEY để "ollama" tuỳ ý)

export const resolveProvider = () => {
  const forced = (process.env.CHAT_PROVIDER || '').trim().toLowerCase()
  if (forced === 'anthropic' || forced === 'openai') return forced
  // Tự nhận diện nếu không ép cụ thể: ưu tiên Anthropic nếu có key, ngược lại OpenAI-compatible
  if ((process.env.ANTHROPIC_API_KEY || '').trim()) return 'anthropic'
  if ((process.env.OPENAI_API_KEY || '').trim()) return 'openai'
  return 'anthropic' // mặc định — sẽ báo lỗi "chưa cấu hình" nếu thiếu key
}

// Đọc thời gian chờ gợi ý (giây) từ header "Retry-After" hoặc từ metadata lỗi (OpenRouter),
// để biết chính xác nên chờ bao lâu trước khi tự thử lại khi bị rate-limit (429)
const parseRetryAfter = (resp, errText) => {
  const headerRetry = resp.headers?.get?.('retry-after')
  if (headerRetry && !isNaN(Number(headerRetry))) return Number(headerRetry) * 1000

  try {
    const parsed = JSON.parse(errText)
    const sec = parsed?.error?.metadata?.retry_after_seconds
    if (sec && !isNaN(Number(sec))) return Number(sec) * 1000
  } catch {
    // errText không phải JSON hợp lệ — bỏ qua
  }
  return null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Một số model free (dạng "reasoning", vd DeepSeek R1, QwQ...) đôi khi trả về
// quá trình suy nghĩ (chain-of-thought) kèm trong nội dung, dưới dạng thẻ
// <think>...</think> / <reasoning>...</reasoning>. Cắt bỏ các thẻ này trước khi xử lý.
export const stripReasoningTags = (text) => {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim()
}

// Phát hiện trường hợp model KHÔNG dùng thẻ <think> mà viết thẳng suy luận
// (thường bằng tiếng Anh) ra làm nội dung trả lời — model free yếu hay gặp lỗi này.
const COT_LEAK_PATTERNS = [
  /\bwe need to\b/i, /\blet'?s\b/i, /\bi need to\b/i, /\bfirst,?\s/i,
  /\bso the (user|answer)\b/i, /\bstep by step\b/i, /\btherefore\b/i,
  /\bthe user (asks?|wants?|is asking)\b/i, /\blet me\b/i, /\bokay,?\s/i,
  /\bcheck (each|the) (phone|product)\b/i, /\bonly .* qualif(y|ies)\b/i,
]

export const looksLikeLeakedReasoning = (text) => {
  const hits = COT_LEAK_PATTERNS.reduce((count, re) => count + (re.test(text) ? 1 : 0), 0)
  return hits >= 2
}

// ═══════════════ Gọi Anthropic (Claude) Messages API ═══════════════
const callAnthropic = async (systemPrompt, history, maxTokens) => {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    const err = new Error('AI hiện chưa được cấu hình (thiếu ANTHROPIC_API_KEY). Vui lòng liên hệ shop qua hotline để được hỗ trợ.')
    err.statusCode = 503
    throw err
  }

  const model = (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').trim()

  let resp
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 700,
        system: systemPrompt,
        messages: history,
      }),
    })
  } catch (err) {
    console.error('❌ Lỗi kết nối Anthropic API:', err.message)
    const e = new Error('Không thể kết nối tới dịch vụ AI (Anthropic), vui lòng thử lại sau.')
    e.statusCode = 502
    throw e
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    console.error('❌ Anthropic API error:', resp.status, errText)
    const e = new Error(
      resp.status === 429
        ? 'Đã đạt giới hạn (rate limit) của Anthropic, vui lòng thử lại sau ít phút hoặc đổi sang nhà cung cấp khác (xem CHAT_PROVIDER trong .env).'
        : 'AI (Anthropic) đang gặp sự cố, vui lòng thử lại sau.'
    )
    e.statusCode = resp.status === 429 ? 429 : 502
    e.retryAfterMs = parseRetryAfter(resp, errText)
    throw e
  }

  let data
  try {
    data = await resp.json()
  } catch (err) {
    const e = new Error('AI trả về dữ liệu không hợp lệ, vui lòng thử lại.')
    e.statusCode = 502
    throw e
  }

  const text = Array.isArray(data?.content)
    ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    : ''

  return text
}

// ═══════ Gọi API chuẩn OpenAI Chat Completions (OpenAI/OpenRouter/Groq/DeepSeek/Ollama...) ═══════
const callOpenAICompatible = async (systemPrompt, history, maxTokens) => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    const err = new Error('AI hiện chưa được cấu hình (thiếu OPENAI_API_KEY). Vui lòng liên hệ shop qua hotline để được hỗ trợ.')
    err.statusCode = 503
    throw err
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '')
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()

  let resp
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 700,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
      }),
    })
  } catch (err) {
    console.error('❌ Lỗi kết nối OpenAI-compatible API:', err.message)
    const e = new Error('Không thể kết nối tới dịch vụ AI, vui lòng thử lại sau.')
    e.statusCode = 502
    throw e
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    console.error('❌ OpenAI-compatible API error:', resp.status, errText)
    const e = new Error(
      resp.status === 429
        ? 'Đã đạt giới hạn (rate limit) của nhà cung cấp AI hiện tại, vui lòng thử lại sau ít phút.'
        : 'AI đang gặp sự cố, vui lòng thử lại sau.'
    )
    e.statusCode = resp.status === 429 ? 429 : 502
    e.retryAfterMs = parseRetryAfter(resp, errText)
    throw e
  }

  let data
  try {
    data = await resp.json()
  } catch (err) {
    const e = new Error('AI trả về dữ liệu không hợp lệ, vui lòng thử lại.')
    e.statusCode = 502
    throw e
  }

  return data?.choices?.[0]?.message?.content || ''
}

// ═══════════════ Hàm cấp cao: gọi AI kèm tự động retry ═══════════════
// - Tự chọn provider (Anthropic hoặc OpenAI-compatible) theo .env
// - Tự chờ đúng thời gian rồi thử lại nếu bị rate-limit (429) có gợi ý Retry-After
// - Tự thử lại nếu model trả về rỗng (hay gặp ở model free bị quá tải)
// - Tự cắt thẻ <think>/<reasoning> và thử lại nếu phát hiện model lộ chuỗi suy luận
//
// options: { maxTokens?: number, checkLeak?: boolean (mặc định true) }
// Trả về text đã làm sạch. Ném lỗi có .statusCode nếu thất bại hẳn.
export const callAI = async (systemPrompt, history, options = {}) => {
  const { maxTokens, checkLeak = true } = options
  const provider = resolveProvider()
  const callProvider = () => (provider === 'openai'
    ? callOpenAICompatible(systemPrompt, history, maxTokens)
    : callAnthropic(systemPrompt, history, maxTokens))

  let rawText
  try {
    rawText = await callProvider()
  } catch (err) {
    // Bị rate-limit (429) và nhà cung cấp có gợi ý thời gian chờ → chờ đúng thời gian đó rồi thử lại 1 lần
    if (err.statusCode === 429 && err.retryAfterMs) {
      const waitMs = Math.min(err.retryAfterMs + 500, 15000) // chờ thêm 0.5s cho chắc, tối đa 15s
      console.warn(`⚠️ Bị rate-limit, chờ ${Math.round(waitMs / 1000)}s rồi thử lại...`)
      await sleep(waitMs)
      rawText = await callProvider()
    } else {
      throw err
    }
  }

  // Model free đôi khi trả về rỗng do quá tải/nghẽn — tự thử lại 1 lần trước khi báo lỗi
  if (!rawText || !rawText.trim()) {
    console.warn('⚠️ AI trả về phản hồi rỗng, đang thử lại lần 2...')
    rawText = await callProvider()
  }

  rawText = stripReasoningTags(rawText || '')

  if (checkLeak && looksLikeLeakedReasoning(rawText)) {
    console.warn('⚠️ Phát hiện AI lộ chuỗi suy luận (chain-of-thought), đang thử lại...')
    const retryText = stripReasoningTags(await callProvider())
    if (!looksLikeLeakedReasoning(retryText) && retryText.trim()) {
      rawText = retryText
    }
  }

  if (!rawText || !rawText.trim()) {
    const e = new Error('AI không trả về phản hồi hợp lệ sau khi thử lại. Model bạn đang dùng có thể đang quá tải — vui lòng thử lại sau ít phút hoặc đổi sang model/nhà cung cấp khác trong .env.')
    e.statusCode = 502
    throw e
  }

  if (checkLeak && looksLikeLeakedReasoning(rawText)) {
    const e = new Error('Model AI bạn đang dùng trả lời không ổn định (lộ quá trình suy luận thay vì câu trả lời). Vui lòng thử lại, hoặc đổi OPENAI_MODEL sang model khác trong .env (khuyến khích model instruct, không phải reasoning).')
    e.statusCode = 502
    throw e
  }

  return rawText
}