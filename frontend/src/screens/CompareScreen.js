import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import Loader from '../components/Loader'
import Message from '../components/Message'
import Meta from '../components/Meta'
import { removeFromCompare, clearCompare } from '../actions/compareActions'

// ═══════════════════ B7: Trang so sánh sản phẩm ═══════════════════
// Bảng thông số kỹ thuật, giá, màu sắc, đánh giá song song — highlight khác biệt
// (giá trị tốt hơn) bằng màu xanh + dấu ✅ cho các thông số so sánh được khách quan.

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN')

// ── Trích số liệu từ chuỗi để so sánh khách quan ──
const parseGB = (str) => {
  if (!str) return null
  const m = String(str).match(/([\d.]+)\s*(GB|TB)/i)
  if (!m) return null
  const val = parseFloat(m[1])
  return m[2].toUpperCase() === 'TB' ? val * 1024 : val
}

const parseScreenInch = (str) => {
  if (!str) return null
  const m = String(str).match(/([\d.]+)/)
  return m ? parseFloat(m[1]) : null
}

const sumCameraMP = (str) => {
  if (!str) return null
  const matches = String(str).match(/([\d.]+)\s*MP/gi)
  if (!matches || matches.length === 0) return null
  return matches.reduce((sum, m) => sum + parseFloat(m), 0)
}

// Tìm TẤT CẢ các cột có giá trị tốt nhất (mode 'max' hoặc 'min') — nếu 2+ cột
// bằng nhau và cùng là giá trị tốt nhất, TẤT CẢ đều được tô màu, không chỉ 1 cột.
// Trả về mảng rỗng nếu không có gì để so sánh hoặc mọi giá trị đều bằng nhau
// (không có gì nổi bật để highlight).
const getBestIndices = (values, mode) => {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v !== null && x.v !== undefined && !Number.isNaN(x.v))
  if (valid.length < 2) return []

  const allEqual = valid.every((x) => x.v === valid[0].v)
  if (allEqual) return []

  const bestValue = mode === 'min'
    ? Math.min(...valid.map((x) => x.v))
    : Math.max(...valid.map((x) => x.v))

  return valid.filter((x) => x.v === bestValue).map((x) => x.i)
}

const ROWS = [
  { label: 'Giá bán', getValue: (p) => p.price, format: (p) => `${formatVnd(p.price)}đ`, mode: 'min' },
  { label: 'RAM', getValue: (p) => parseGB(p.specs?.ram), format: (p) => p.specs?.ram || '—', mode: 'max' },
  { label: 'Bộ nhớ trong', getValue: (p) => parseGB(p.specs?.storage), format: (p) => p.specs?.storage || '—', mode: 'max' },
  { label: 'Pin', getValue: (p) => p.specs?.battery || null, format: (p) => (p.specs?.battery ? `${p.specs.battery} mAh` : '—'), mode: 'max' },
  { label: 'Màn hình', getValue: (p) => parseScreenInch(p.specs?.screenSize), format: (p) => [p.specs?.screenSize, p.specs?.screenType].filter(Boolean).join(' ') || '—', mode: 'max' },
  { label: 'Camera sau', getValue: (p) => sumCameraMP(p.specs?.camera), format: (p) => p.specs?.camera || '—', mode: 'max' },
  { label: 'Camera trước', getValue: (p) => sumCameraMP(p.specs?.cameraFront), format: (p) => p.specs?.cameraFront || '—', mode: 'max' },
  { label: 'Chip', getValue: () => null, format: (p) => p.specs?.chip || '—', mode: null },
  { label: 'Hệ điều hành', getValue: () => null, format: (p) => p.specs?.os || '—', mode: null },
  { label: 'SIM', getValue: () => null, format: (p) => p.specs?.sim || '—', mode: null },
  { label: 'Kết nối', getValue: () => null, format: (p) => p.specs?.connectivity || '—', mode: null },
  { label: 'Đánh giá', getValue: (p) => p.rating || 0, format: (p) => `${(p.rating || 0).toFixed(1)}/5 (${p.numReviews || 0})`, mode: 'max' },
]

const CompareScreen = ({ history }) => {
  const dispatch = useDispatch()
  const compareItems = useSelector((state) => state.compare.compareItems)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      if (compareItems.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const results = await Promise.all(
          compareItems.map((item) => axios.get(`/api/products/${item._id}`).then((res) => res.data))
        )
        setProducts(results)
      } catch (err) {
        setError('Không tải được thông tin sản phẩm để so sánh. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareItems.length])

  const removeHandler = (id) => {
    dispatch(removeFromCompare(id))
  }

  return (
    <>
      <Meta title='So sánh sản phẩm' />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => history.push('/')}
          style={{
            color: '#33FFCC', background: 'transparent', textDecoration: 'none',
            border: '1px solid #33FFCC', borderRadius: '8px', padding: '6px 16px', fontSize: '14px', cursor: 'pointer',
          }}
        >
          <i className='fas fa-arrow-left me-2'></i>Tiếp tục mua sắm
        </button>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.4rem' }}>
          <i className='fas fa-balance-scale me-2' style={{ color: '#33FFCC' }}></i>So sánh sản phẩm
        </h2>
        {products.length > 0 && (
          <button
            onClick={() => dispatch(clearCompare())}
            style={{
              marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: '#b8bcc8', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : products.length < 2 ? (
        <Message>
          Cần chọn ít nhất 2 sản phẩm để so sánh. Bấm vào icon{' '}
          <i className='fas fa-balance-scale' style={{ color: '#33FFCC' }}></i> trên các sản phẩm bạn muốn so sánh.
        </Message>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${240 + products.length * 220}px` }}>
            <thead>
              <tr>
                <th style={{ width: '180px' }}></th>
                {products.map((p) => (
                  <th key={p._id} style={{
                    background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)',
                    padding: '16px', textAlign: 'center', verticalAlign: 'top',
                  }}>
                    <button
                      onClick={() => removeHandler(p._id)}
                      style={{ float: 'right', background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
                    >
                      <i className='fas fa-times'></i>
                    </button>
                    <img src={p.image} alt={p.name} style={{
                      width: '90px', height: '90px', objectFit: 'contain',
                      background: '#0f0f23', borderRadius: '10px', padding: '8px', marginBottom: '10px',
                    }} />
                    <Link to={`/product/${p._id}`} style={{
                      display: 'block', color: '#ffffff', fontWeight: '700', fontSize: '14px',
                      textDecoration: 'none', marginBottom: '4px',
                    }}>
                      {p.name}
                    </Link>
                    <div style={{ color: '#b8bcc8', fontSize: '12px' }}>{p.brand}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Màu sắc / tồn kho — hiển thị riêng, không auto-highlight vì mang tính thông tin */}
              <tr>
                <td style={rowLabelStyle}>Màu sắc / Tồn kho</td>
                {products.map((p) => (
                  <td key={p._id} style={cellStyle}>
                    {Array.isArray(p.colors) && p.colors.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        {p.colors.map((c, idx) => (
                          <span key={idx} style={{ color: c.countInStock > 0 ? '#eef0f7' : '#6b7085', fontSize: '12.5px' }}>
                            {c.name}: {c.countInStock > 0 ? `còn ${c.countInStock}` : 'hết hàng'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: p.countInStock > 0 ? '#eef0f7' : '#6b7085', fontSize: '12.5px' }}>
                        {p.countInStock > 0 ? `Còn ${p.countInStock}` : 'Hết hàng'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {ROWS.map((row) => {
                const values = products.map(row.getValue)
                const bestIndices = row.mode ? getBestIndices(values, row.mode) : []
                return (
                  <tr key={row.label}>
                    <td style={rowLabelStyle}>{row.label}</td>
                    {products.map((p, idx) => (
                      <td key={p._id} style={{
                        ...cellStyle,
                        ...(bestIndices.includes(idx) ? { color: '#4cdb80', fontWeight: '700' } : {}),
                      }}>
                        {row.format(p)}{bestIndices.includes(idx) ? ' ✅' : ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const rowLabelStyle = {
  background: '#0f0f23', border: '1px solid rgba(51,255,204,0.1)',
  padding: '14px 16px', color: '#b8bcc8', fontSize: '13px', fontWeight: '600',
}

const cellStyle = {
  background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.1)',
  padding: '14px 16px', textAlign: 'center', color: '#eef0f7', fontSize: '13.5px',
}

export default CompareScreen