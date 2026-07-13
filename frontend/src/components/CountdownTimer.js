import React, { useEffect, useState } from 'react'

// ═══════════════════ B8: Đếm ngược thời gian Flash Sale ═══════════════════

const getTimeParts = (endsAt) => {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

const pad = (n) => String(n).padStart(2, '0')

const CountdownTimer = ({ endsAt, onExpire, size = 'sm' }) => {
  const [parts, setParts] = useState(() => getTimeParts(endsAt))

  useEffect(() => {
    const tick = setInterval(() => {
      const next = getTimeParts(endsAt)
      setParts(next)
      if (!next) {
        clearInterval(tick)
        if (onExpire) onExpire()
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [endsAt, onExpire])

  if (!parts) return null

  const fontSize = size === 'lg' ? '14px' : '11.5px'

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      color: '#ff6b6b', fontSize, fontWeight: '700',
    }}>
      <i className='fas fa-clock' style={{ fontSize }}></i>
      Kết thúc sau {parts.hours > 0 ? `${pad(parts.hours)}:` : ''}{pad(parts.minutes)}:{pad(parts.seconds)}
    </div>
  )
}

export default CountdownTimer