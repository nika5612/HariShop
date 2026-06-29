import React from 'react'

const PIE_COLORS = [
  '#0dcaf0',
  '#6610f2',
  '#dc3545',
  '#198754',
  '#fd7e14',
  '#6c757d',

]

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    'Z',
  ].join(' ')
}

function PieChart({ labels = [], percentages = [], values = [], size = 300 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8

  const safe = Array.isArray(percentages) && percentages.length ? percentages : []
  const total = safe.reduce((a, b) => a + (Number(b) || 0), 0)
  const scaled = total > 0 ? safe.map((v) => (Number(v) || 0) / total) : safe.map(() => 0)

  const slices = []
  let currentAngle = 0
  scaled.forEach((ratio, idx) => {
    const sweep = ratio * 360
    slices.push({
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
      midAngle: currentAngle + sweep / 2,
      ratio,
      idx,
    })
    currentAngle += sweep
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
      {/* PIE SVG */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map((sl) => {
          const color = PIE_COLORS[sl.idx % PIE_COLORS.length]
          const pct = Math.round((Number(percentages[sl.idx]) || 0) * 10) / 10
          const labelPos = polarToCartesian(cx, cy, r * 0.62, sl.midAngle)
          const showLabel = sl.ratio > 0.05

          return (
            <g key={sl.idx}>
              <path
                d={slicePath(cx, cy, r, sl.startAngle, sl.endAngle)}
                fill={color}
                stroke='#0f0f23'
                strokeWidth='2'
                style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.82')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              />
              {showLabel && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  style={{
                    fontSize: size * 0.05,
                    fontWeight: '700',
                    fill: '#ffffff',
                    pointerEvents: 'none',
                  }}
                >
                  {pct > 0 ? `${pct}%` : ''}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* LEGEND */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '190px' }}>
        {labels.map((label, idx) => {
          const pct = total > 0
            ? Math.round((Number(percentages[idx]) || 0) * 10) / 10
            : 0
          const vnd = Number(values[idx] || 0)
          const color = PIE_COLORS[idx % PIE_COLORS.length]

          return (
            <div key={label + idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                background: color, flexShrink: 0,
                boxShadow: `0 0 8px ${color}99`,
              }} />
              <div>
                <div style={{ color: '#ffffff', fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>
                  {label}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ color, fontWeight: '700', fontSize: 13 }}>
                    {pct}%
                  </span>
                  {vnd > 0 && (
                    <span style={{ color: '#b8bcc8', fontSize: 12 }}>
                      {vnd.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PieChart