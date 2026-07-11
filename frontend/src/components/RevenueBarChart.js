import React, { useState } from 'react'

// Biểu đồ cột SVG đơn giản — không phụ thuộc thư viện ngoài,
// đồng bộ phong cách với components/PieChart.js đã có sẵn.
function RevenueBarChart({ data = [], height = 260 }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  const safeData = Array.isArray(data) ? data : []
  const maxRevenue = Math.max(1, ...safeData.map((d) => Number(d.revenue) || 0))

  const barGap = 6
  const barWidth = safeData.length > 0
    ? Math.max(6, Math.min(36, (100 / safeData.length) - 1))
    : 20

  if (safeData.length === 0) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#6b7085', fontSize: 14,
      }}>
        Không có dữ liệu doanh thu trong khoảng thời gian này
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: `${barGap}px`,
        height, borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 4px', position: 'relative', overflowX: 'auto',
      }}>
        {safeData.map((d, i) => {
          const revenue = Number(d.revenue) || 0
          const barHeightPct = (revenue / maxRevenue) * 100
          const isHover = hoverIdx === i
          const day = d.date ? d.date.split('-')[2] : i + 1

          return (
            <div
              key={d.date || i}
              style={{
                width: `${barWidth}%`, minWidth: '10px', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                height: '100%', justifyContent: 'flex-end', position: 'relative',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {isHover && (
                <div style={{
                  position: 'absolute', bottom: `calc(${barHeightPct}% + 10px)`,
                  background: '#1a1a2e', border: '1px solid #33FFCC',
                  borderRadius: 8, padding: '6px 10px', fontSize: 12,
                  color: '#ffffff', whiteSpace: 'nowrap', zIndex: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ fontWeight: 700, color: '#33FFCC' }}>
                    {revenue.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ color: '#b8bcc8' }}>{d.orders || 0} đơn — Ngày {day}</div>
                </div>
              )}
              <div style={{
                width: '100%',
                height: `${Math.max(barHeightPct, revenue > 0 ? 2 : 0)}%`,
                background: isHover
                  ? 'linear-gradient(180deg, #33FFCC, #00D4AA)'
                  : 'linear-gradient(180deg, rgba(51,255,204,0.7), rgba(0,212,170,0.5))',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.15s ease',
              }} />
            </div>
          )
        })}
      </div>
      {/* Trục ngày — chỉ hiện 1 số mốc để đỡ rối */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 4px' }}>
        <span style={{ color: '#6b7085', fontSize: 11 }}>
          {safeData[0]?.date?.split('-').reverse().slice(0, 2).join('/') || ''}
        </span>
        <span style={{ color: '#6b7085', fontSize: 11 }}>
          {safeData[safeData.length - 1]?.date?.split('-').reverse().slice(0, 2).join('/') || ''}
        </span>
      </div>
    </div>
  )
}

export default RevenueBarChart