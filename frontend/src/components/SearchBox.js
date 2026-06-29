import React, { useState } from 'react'
import { Form, Button } from 'react-bootstrap'

const SearchBox = ({ history }) => {
  const [keyword, setKeyword] = useState('')

  const submitHandler = (e) => {
    e.preventDefault()
    if (keyword.trim()) {
      history.push(`/?keyword=${keyword}`)
    } else {
      history.push('/')
    }
  }

  return (
    <Form onSubmit={submitHandler} inline>
      <Form.Control
        type='text'
        name='q'
        onChange={(e) => setKeyword(e.target.value)}
        placeholder='Tìm Kiếm Sản Phẩm...'
        style={{
          background: '#0f0f23',
          border: '1px solid rgba(51,255,204,0.4)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '12px 16px',
          marginRight: '12px'
        }}
        className='flex-grow-1'
      />
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
