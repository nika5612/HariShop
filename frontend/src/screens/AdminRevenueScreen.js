import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import RevenueBarChart from '../components/RevenueBarChart'
import { getRevenueAnalytics } from '../actions/orderAdminActions'

const cardStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(51,255,204,0.15)',
  borderRadius: '16px',
  padding: '20px',
}

const statCardStyle = {
  ...cardStyle,
  padding: '18px 20px',
  flex: '1 1 200px',
  minWidth: '200px',
}

const inputStyle = {
  background: '#0f0f23',
  color: '#eef0f7',
  border: '1px solid rgba(51,255,204,0.35)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
}

const now = new Date()
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => i + 1)
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

const AdminRevenueScreen = () => {
  const dispatch = useDispatch()

  const [period, setPeriod] = useState('month')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const revenueAnalytics = useSelector((state) => state.revenueAnalytics)
  const { loading, error, data } = revenueAnalytics

  const fetchData = () => {
    const params = { period }
    if (period === 'month') { params.month = month; params.year = year }
    else if (period === 'quarter') { params.quarter = quarter; params.year = year }
    else if (period === 'year') { params.year = year }
    else if (period === 'custom') {
      if (!startDate || !endDate) return
      params.startDate = startDate
      params.endDate = endDate
    }
    dispatch(getRevenueAnalytics(params))
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = data?.stats || {}
  const comparison = data?.comparison || {}
  const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : []
  const dailyRevenue = Array.isArray(data?.dailyRevenue) ? data.dailyRevenue : []

  const currentTotal = comparison.current?.total || 0
  const previousTotal = comparison.previous?.total || 0
  const diff = currentTotal - previousTotal
  const diffPct = previousTotal > 0 ? Math.round((diff / previousTotal) * 1000) / 10 : (currentTotal > 0 ? 100 : 0)
  const maxCompare = Math.max(currentTotal, previousTotal, 1)

  return (
    <>
      <Meta title='Thống kê doanh thu | Admin' />
      <Link to='/admin/productlist' className='btn btn-light my-3'>
        Go Back
      </Link>

      <h1 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 20 }}>
        <i className='fas fa-chart-line me-2' style={{ color: '#33FFCC' }}></i>
        Thống Kê Doanh Thu
      </h1>

      {/* ── Bộ lọc thời gian ── */}
      <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Xem theo</div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle}>
            <option value='month'>Tháng</option>
            <option value='quarter'>Quý</option>
            <option value='year'>Năm</option>
            <option value='custom'>Tùy chọn khoảng ngày</option>
          </select>
        </div>

        {period === 'month' && (
          <>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Tháng</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
                {MONTH_NAMES.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Năm</div>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        {period === 'quarter' && (
          <>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Quý</div>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} style={inputStyle}>
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Quý {q}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Năm</div>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        {period === 'year' && (
          <div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Năm</div>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {period === 'custom' && (
          <>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Từ ngày</div>
              <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Đến ngày</div>
              <input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        <button
          onClick={fetchData}
          style={{
            background: '#33FFCC', border: 'none', borderRadius: 8,
            padding: '9px 20px', color: '#0f0f23', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', height: 'fit-content',
          }}
        >
          <i className='fas fa-sync-alt me-2'></i>Xem thống kê
        </button>
      </div>

      {loading && <Loader />}
      {error && <Message variant='danger'>{error}</Message>}

      {data && (
        <>
          {/* ── Thẻ thống kê nhanh ── */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={statCardStyle}>
              <div style={{ color: '#b8bcc8', fontSize: 13 }}>Tổng doanh thu</div>
              <div style={{ color: '#33FFCC', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {stats.totalRevenue?.toLocaleString('vi-VN') || 0}đ
              </div>
              <div style={{ color: '#6b7085', fontSize: 12, marginTop: 2 }}>{data.label}</div>
            </div>

            <div style={statCardStyle}>
              <div style={{ color: '#b8bcc8', fontSize: 13 }}>Số đơn thành công</div>
              <div style={{ color: '#4cdb80', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {stats.successOrders || 0} <span style={{ fontSize: 14, color: '#6b7085' }}>/ {stats.totalOrders || 0} đơn</span>
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ color: '#b8bcc8', fontSize: 13 }}>Tỷ lệ giao thành công</div>
              <div style={{ color: '#4cdb80', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {stats.successRate || 0}%
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ color: '#b8bcc8', fontSize: 13 }}>Tỷ lệ hủy đơn</div>
              <div style={{ color: '#ff6b6b', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {stats.cancelRate || 0}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
            {/* ── Biểu đồ cột doanh thu theo ngày ── */}
            <div style={{ ...cardStyle, flex: '2 1 480px' }}>
              <h5 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 16 }}>
                Doanh thu theo ngày — {data.label}
              </h5>
              <RevenueBarChart data={dailyRevenue} />
            </div>

            {/* ── So sánh kỳ này vs kỳ trước ── */}
            <div style={{ ...cardStyle, flex: '1 1 280px' }}>
              <h5 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 16 }}>
                So sánh với kỳ trước
              </h5>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b8bcc8', marginBottom: 4 }}>
                  <span>{comparison.current?.label}</span>
                  <span style={{ color: '#33FFCC', fontWeight: 700 }}>{currentTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div style={{ background: '#0f0f23', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(currentTotal / maxCompare) * 100}%`, height: '100%',
                    background: 'linear-gradient(90deg, #33FFCC, #00D4AA)',
                  }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b8bcc8', marginBottom: 4 }}>
                  <span>{comparison.previous?.label}</span>
                  <span style={{ color: '#8a8fa3', fontWeight: 700 }}>{previousTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div style={{ background: '#0f0f23', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(previousTotal / maxCompare) * 100}%`, height: '100%',
                    background: '#3a3a55',
                  }} />
                </div>
              </div>

              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 8,
                background: diff >= 0 ? 'rgba(76,219,128,0.1)' : 'rgba(255,107,107,0.1)',
                border: `1px solid ${diff >= 0 ? '#4cdb80' : '#ff6b6b'}`,
                textAlign: 'center',
              }}>
                <span style={{ color: diff >= 0 ? '#4cdb80' : '#ff6b6b', fontWeight: 700, fontSize: 15 }}>
                  <i className={`fas fa-arrow-${diff >= 0 ? 'up' : 'down'} me-2`}></i>
                  {diff >= 0 ? '+' : ''}{diffPct}%
                </span>
                <span style={{ color: '#b8bcc8', fontSize: 12, marginLeft: 6 }}>so với kỳ trước</span>
              </div>
            </div>
          </div>

          {/* ── Top 5 sản phẩm bán chạy ── */}
          <div style={cardStyle}>
            <h5 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 16 }}>
              Top 5 Sản Phẩm Bán Chạy Nhất
            </h5>

            {topProducts.length === 0 ? (
              <div style={{ color: '#6b7085', fontSize: 14 }}>Chưa có dữ liệu trong khoảng thời gian này</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topProducts.map((p, i) => (
                  <div key={p.productId || p.name} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i === 0 ? '#ffd166' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#3a3a55',
                      color: '#0f0f23', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    {p.image && (
                      <img src={p.image} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ color: '#6b7085', fontSize: 12 }}>Đã bán: {p.qty} sản phẩm</div>
                    </div>
                    <div style={{ color: '#33FFCC', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                      {p.revenue.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default AdminRevenueScreen