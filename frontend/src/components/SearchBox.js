import React, { useState } from 'react'
import { Form, Button } from 'react-bootstrap'

const SearchBox = ({ history }) => {
  const [keyword, setKeyword] = useState('')
  // MỚI (B3): bật/tắt chế độ tìm kiếm bằng AI (ngôn ngữ tự nhiên) — không thay thế
  // tìm kiếm từ khoá thường, chỉ là 1 lựa chọn song song.
  const [aiMode, setAiMode] = useState(false)

  const submitHandler = (e) => {
    e.preventDefault()
    if (!keyword.trim()) {
      history.push('/')
      return
    }
    if (aiMode) {
      history.push(`/smart-search?q=${encodeURIComponent(keyword.trim())}`)
    } else {
      history.push(`/?keyword=${keyword}`)
    }
  }

  return (
    <Form onSubmit={submitHandler} inline>
      <div style={{ position: 'relative', flex: 1, display: 'flex' }} className='flex-grow-1'>
        <Form.Control
          type='text'
          name='q'
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={aiMode ? 'Mô tả nhu cầu, vd: điện thoại Samsung dưới 15 triệu...' : 'Tìm Kiếm Sản Phẩm...'}
          style={{
            background: '#0f0f23',
            border: `1px solid ${aiMode ? '#33FFCC' : 'rgba(51,255,204,0.4)'}`,
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 44px 12px 16px',
            marginRight: '12px',
            width: '100%',
          }}
          className='flex-grow-1'
        />
        <button
          type='button'
          onClick={() => setAiMode((v) => !v)}
          title={aiMode ? 'Đang bật tìm kiếm AI (bấm để tắt)' : 'Bật tìm kiếm bằng AI (mô tả tự nhiên)'}
          style={{
            position: 'absolute', right: '22px', top: '50%', transform: 'translateY(-50%)',
            background: aiMode ? '#33FFCC' : 'transparent',
            border: 'none', borderRadius: '8px', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
          }}
        >
          <i className='fas fa-robot' style={{ color: aiMode ? '#0f0f23' : '#33FFCC', fontSize: '14px' }}></i>
        </button>
      </div>
      <Button 
        type='submit' 
        style={{
          background: '#33FFCC',
          border: 'none',
          color: '#0f0f23',
          fontWeight: '700',
          borderRadius: '12px',
          padding: '12px 20px',
          boxShadow: '0 4px 15px rgba(51,255,204,0.3)'
        }}
      >
        <i className='fas fa-search me-1'></i>Tìm Kiếm
      </Button>
    </Form>
  )
}

export default SearchBox