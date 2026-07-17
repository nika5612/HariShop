import React from 'react'
import { Form } from 'react-bootstrap'

const SortDropdown = ({ sort, setSort, compact = false }) => {
  return (
    <Form.Group controlId='sort' style={{ marginBottom: compact ? 0 : '1rem' }}>
      {!compact && (
        <Form.Label style={{ color: '#ffffff', fontWeight: '500', marginBottom: '8px' }}>
          Sắp xếp theo
        </Form.Label>
      )}
      <Form.Control
        as='select'
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        style={{
          background: '#0f0f23',
          border: '1px solid rgba(51,255,204,0.4)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: compact ? '8px 12px' : '12px 16px',
          fontSize: compact ? '13px' : '15px'
        }}
      >
        <option value='latest' style={{ background: '#1a1a2e', color: '#ffffff' }}>Mới nhất</option>
        <option value='priceAsc' style={{ background: '#1a1a2e', color: '#ffffff' }}>Giá tăng dần</option>
        <option value='priceDesc' style={{ background: '#1a1a2e', color: '#ffffff' }}>Giá giảm dần</option>
      </Form.Control>
    </Form.Group>
  )
}

export default SortDropdown