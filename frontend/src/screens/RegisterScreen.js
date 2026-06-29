import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { register } from '../actions/userActions'

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const RegisterScreen = ({ location, history }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [detail, setDetail] = useState('')
  const [ward, setWard] = useState('')
  const [province, setProvince] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const dispatch = useDispatch()

  const userRegister = useSelector((state) => state.userRegister)
  const { loading, error: registerError, userInfo } = userRegister

  const redirect = location.search ? location.search.split('=')[1] : '/'

  useEffect(() => {
    if (userInfo) {
      history.push(redirect)
    }
  }, [history, userInfo, redirect])

  const submitHandler = (e) => {
    e.preventDefault()
    setError('')

    // Existing validations
    if (!validateEmail(email)) {
      setError('Email không đúng định dạng')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.')
      return
    }
    if (phone.length !== 10 || !/^[0-9]{10}$/.test(phone)) {
      setError('Số điện thoại phải đúng 10 chữ số.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự.')
      return
    }

    // Address validation (no district)
    const requiredFields = [
      { name: 'Địa chỉ chi tiết', value: detail.trim() },
      { name: 'Phường/Xã', value: ward.trim() },
      { name: 'Tỉnh/Thành phố', value: province.trim() }
    ]
    for (const field of requiredFields) {
      if (!field.value) {
        setError(`❌ Vui lòng nhập ${field.name}`)
        setTimeout(() => setError(''), 5000)
        return
      }
    }

    // Create structured address (no district)
    const addressObj = {
      fullName: name.trim(),
      phone: phone.trim(),
      province: province.trim(),
      ward: ward.trim(),
      detail: detail.trim()
      // district omitted per request
    }

    dispatch(register(name, phone, email, password, addressObj))
  }

  return (
    <FormContainer>
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '1.5rem' }}>
        <i className='fas fa-user-plus me-3' style={{ color: '#33FFCC' }}></i>Đăng Ký
      </h1>

      {registerError && <Message variant='danger'>{registerError}</Message>}
      {loading && <Loader />}

      {error && (
        <div style={{
          background: 'rgba(220,53,69,0.15)',
          border: '1px solid #dc3545',
          color: '#ff6b6b',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          fontSize: '15px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <Form onSubmit={submitHandler} autoComplete='off'>
        <Form.Group controlId='name' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Họ và tên *</Form.Label>
          <Form.Control
            type='text'
            placeholder='Nhập họ và tên đầy đủ'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete='off'
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Form.Group controlId='phone' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Số điện thoại *</Form.Label>
          <Form.Control
            type='tel'
            placeholder='Nhập số điện thoại'
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            required
            maxLength={10}
            autoComplete='off'
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
          <Form.Text className='text-muted' style={{ fontSize: '0.85rem', color: '#b8bcc8 !important' }}>
            Ví dụ: 0123456789 (10 số)
          </Form.Text>
        </Form.Group>

        <Form.Group controlId='email' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Email *</Form.Label>
          <Form.Control
            type='email'
            placeholder='Nhập email của bạn (VD: example@gmail.com)'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete='new-email'
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Form.Group controlId='detail' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Số nhà, tên đường *</Form.Label>
          <Form.Control
            as='textarea'
            rows={2}
            placeholder='Số nhà, tên đường, địa danh nổi bật...'
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px',
              resize: 'vertical'
            }}
          />
        </Form.Group>

        <Form.Group controlId='ward' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Phường/Xã *</Form.Label>
          <Form.Control
            type='text'
            placeholder='VD: Phường Bến Nghé, Xã An Phú...'
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Form.Group controlId='province' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Tỉnh/Thành phố *</Form.Label>
          <Form.Control
            type='text'
            placeholder='VD: TP. Hồ Chí Minh, Hà Nội...'
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Form.Group controlId='password' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Mật khẩu *</Form.Label>
          <Form.Control
            type='password'
            placeholder='Tạo mật khẩu mạnh (ít nhất 6 ký tự)'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete='new-password'
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Form.Group controlId='confirmPassword' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Nhập lại mật khẩu *</Form.Label>
          <Form.Control
            type='password'
            placeholder='Xác nhận mật khẩu'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete='new-password'
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
        </Form.Group>

        <Button 
          type='submit' 
          disabled={!!error || loading}
          style={{
            width: '100%',
            background: error || loading ? '#666' : 'linear-gradient(135deg, #33FFCC, #00D4AA)',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '16px',
            boxShadow: (error || loading) ? 'none' : '0 6px 20px rgba(51,255,204,0.4)',
            marginTop: '1rem',
            opacity: (error || loading) ? 0.7 : 1,
            cursor: (error || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          <i className='fas fa-user-plus me-2'></i>
          {loading ? 'Đang tạo...' : 'Tạo Tài Khoản'}
        </Button>
      </Form>

      <Row style={{ marginTop: '2rem' }}>
        <Col style={{ textAlign: 'center', color: '#b8bcc8' }}>
          Đã Có Tài Khoản?{' '}
          <Link to={redirect ? `/login?redirect=${redirect}` : '/login'} style={{ 
            color: '#33FFCC', 
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Đăng Nhập Ngay
          </Link>
        </Col>
      </Row>
    </FormContainer>
  )
}

export default RegisterScreen

