import React, { useState } from 'react'
import { Form } from 'react-bootstrap'

// MỚI: Ô nhập mật khẩu dùng chung, có nút ẩn/hiện (con mắt) — dùng lại ở
// LoginScreen, RegisterScreen, ProfileScreen thay vì lặp code 6 lần.
const PasswordInput = ({
  value,
  onChange,
  placeholder = 'Nhập mật khẩu',
  style = {},
  maxLength,
  ...rest
}) => {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <Form.Control
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        style={{ ...style, paddingRight: '44px' }}
        {...rest}
      />
      <span
        onClick={() => setShow((s) => !s)}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'pointer',
          color: '#b8bcc8',
          fontSize: '16px',
          userSelect: 'none',
        }}
      >
        <i className={show ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
      </span>
    </div>
  )
}

export default PasswordInput