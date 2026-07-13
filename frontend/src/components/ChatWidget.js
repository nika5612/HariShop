import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { addToCart } from '../actions/cartActions'

// ═══════════════════ B2: AI Chatbot tư vấn sản phẩm ═══════════════════
// Widget chat nổi (floating button) góc phải màn hình.
// Lịch sử hội thoại chỉ lưu trong state của component (session) —
// tự động mất khi đóng/tải lại tab, KHÔNG lưu localStorage/DB.

const QUICK_PROMPTS = [
  'Điện thoại tầm 10 triệu, pin trâu',
  'Máy nào camera đẹp nhất shop?',
  'Điện thoại nào đang giảm giá?',
]

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Chào bạn 👋 Mình là trợ lý AI của HariShop. Bạn đang tìm điện thoại theo ngân sách hay nhu cầu nào? Ví dụ: "điện thoại tầm 10 triệu, pin trâu, chụp ảnh đẹp".',
  suggestions: [],
}

const formatPrice = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'

const ChatWidget = () => {
  const dispatch = useDispatch()
  const location = useLocation()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedProductId, setAddedProductId] = useState('')

  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, loading])

  // Không hiển thị chatbot trong khu vực quản trị (Admin)
  if (location.pathname.startsWith('/admin')) return null

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? input).trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const { data } = await axios.post('/api/chat', {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        userName: userInfo?.name || '',
      })

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: data.reply, suggestions: data.suggestions || [] },
      ])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra, vui lòng thử lại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAddToCart = (product) => {
    const color = product.colors && product.colors.length > 0
      ? (product.colors.find((c) => c.countInStock > 0)?.name || product.colors[0].name)
      : 'Mặc định'
    dispatch(addToCart(product._id, 1, color))
    setAddedProductId(product._id)
    setTimeout(() => setAddedProductId(''), 1800)
  }

  const clearChat = () => {
    if (window.confirm('Xóa toàn bộ hội thoại hiện tại?')) {
      setMessages([WELCOME_MESSAGE])
      setError('')
    }
  }

  return (
    <>
      {/* ── Nút nổi ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label='Mở chat tư vấn AI'
        style={{
          position: 'fixed', right: '24px', bottom: '24px', zIndex: 1050,
          width: '58px', height: '58px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #33FFCC, #1fb894)',
          border: 'none', boxShadow: '0 6px 20px rgba(51,255,204,0.45)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={open ? 'fas fa-times' : 'fas fa-robot'} style={{ color: '#0f0f23', fontSize: '24px' }}></i>
      </button>

      {/* ── Cửa sổ chat ── */}
      {open && (
        <div style={{
          position: 'fixed', right: '24px', bottom: '92px', zIndex: 1050,
          width: '360px', maxWidth: 'calc(100vw - 32px)', height: '520px', maxHeight: 'calc(100vh - 140px)',
          background: '#1a1a2e', borderRadius: '18px',
          border: '1px solid rgba(51,255,204,0.35)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', background: 'rgba(51,255,204,0.08)',
            borderBottom: '1px solid rgba(51,255,204,0.2)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(51,255,204,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className='fas fa-robot' style={{ color: '#33FFCC', fontSize: '16px' }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>Trợ lý tư vấn HariShop</div>
              <div style={{ color: '#4cdb80', fontSize: '11px' }}><i className='fas fa-circle' style={{ fontSize: '6px', marginRight: '4px' }}></i>Đang hoạt động</div>
            </div>
            <button onClick={clearChat} title='Xóa hội thoại' style={{
              background: 'transparent', border: 'none', color: '#b8bcc8',
              cursor: 'pointer', fontSize: '15px', padding: '6px',
            }}>
              <i className='fas fa-trash-alt'></i>
            </button>
          </div>

          {/* Nội dung tin nhắn */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                  fontSize: '13.5px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? '#33FFCC' : 'rgba(255,255,255,0.06)',
                  color: m.role === 'user' ? '#0f0f23' : '#eef0f7',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {m.content}
                </div>

                {/* Thẻ sản phẩm gợi ý — thêm vào giỏ trực tiếp */}
                {m.role === 'assistant' && Array.isArray(m.suggestions) && m.suggestions.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {m.suggestions.map((p) => (
                      <div key={p._id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(51,255,204,0.2)',
                        borderRadius: '12px', padding: '8px 10px',
                      }}>
                        <img src={p.image} alt={p.name} style={{
                          width: '46px', height: '46px', objectFit: 'contain',
                          background: '#0f0f23', borderRadius: '8px', padding: '4px', flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/product/${p._id}`} onClick={() => setOpen(false)} style={{
                            color: '#ffffff', fontSize: '12.5px', fontWeight: '600',
                            textDecoration: 'none', display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.name}
                          </Link>
                          <div style={{ color: '#33FFCC', fontSize: '12.5px', fontWeight: '700' }}>{formatPrice(p.price)}</div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(p)}
                          disabled={p.countInStock <= 0}
                          style={{
                            background: addedProductId === p._id ? '#4cdb80' : (p.countInStock <= 0 ? '#3a3a55' : '#33FFCC'),
                            border: 'none', borderRadius: '8px', padding: '6px 10px',
                            color: '#0f0f23', fontWeight: '700', fontSize: '11px',
                            cursor: p.countInStock <= 0 ? 'not-allowed' : 'pointer',
                            flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          {p.countInStock <= 0
                            ? 'Hết hàng'
                            : addedProductId === p._id
                              ? <><i className='fas fa-check'></i> Đã thêm</>
                              : <><i className='fas fa-cart-plus'></i> Thêm</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#b8bcc8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className='fas fa-spinner fa-spin' style={{ color: '#33FFCC' }}></i>
                Đang soạn câu trả lời...
              </div>
            )}

            {error && (
              <div style={{ color: '#ff6b6b', fontSize: '12.5px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', padding: '8px 12px' }}>
                <i className='fas fa-exclamation-circle me-2'></i>{error}
              </div>
            )}
          </div>

          {/* Gợi ý nhanh — chỉ hiện khi mới mở, chưa chat gì */}
          {messages.length === 1 && (
            <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {QUICK_PROMPTS.map((q) => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  background: 'rgba(51,255,204,0.08)', border: '1px solid rgba(51,255,204,0.3)',
                  color: '#33FFCC', borderRadius: '16px', padding: '5px 12px',
                  fontSize: '11.5px', cursor: 'pointer',
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Ô nhập */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Nhập nhu cầu của bạn...'
              rows={1}
              style={{
                flex: 1, resize: 'none', background: '#0f0f23', color: '#ffffff',
                border: '1px solid rgba(51,255,204,0.3)', borderRadius: '10px',
                padding: '10px 12px', fontSize: '13px', outline: 'none', maxHeight: '80px',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#3a3a55' : '#33FFCC',
                border: 'none', borderRadius: '10px', width: '42px', flexShrink: 0,
                color: loading || !input.trim() ? '#8a8fa3' : '#0f0f23',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '15px',
              }}
            >
              <i className='fas fa-paper-plane'></i>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget