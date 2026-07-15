import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { login } from '../actions/userActions'


const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
const LoginScreen = ({ location, history }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { loading, error, userInfo } = userLogin

  const redirect = location.search ? location.search.split('=')[1] : '/'

  useEffect(() => {
    if (userInfo) {
      history.push(redirect)
    }
  }, [history, userInfo, redirect])

  const submitHandler = (e) => {
    e.preventDefault()
    dispatch(login(email, password))
  }

  return (
    <FormContainer>
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '1.5rem' }}>
        <i className='fas fa-sign-in-alt me-3' style={{ color: '#33FFCC' }}></i>Đăng Nhập
      </h1>
      {error && <Message variant='danger'>{error}</Message>}
      {loading && <Loader />}
      <Form onSubmit={submitHandler}>
        <Form.Group controlId='email' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Email</Form.Label>
          <Form.Control
            type='email'
            placeholder='Nhập email của bạn'
            value={email}
            required
            isInvalid={email && !validateEmail(email)}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              background: '#0f0f23',
              border: '1px solid rgba(51,255,204,0.4)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />
          <Form.Control.Feedback type='invalid' style={{ color: '#ff6b6b' }}>
            Email không đúng định dạng
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId='password' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Mật khẩu</Form.Label>
          <Form.Control
            type='password'
            placeholder='Nhập mật khẩu'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          style={{
            width: '100%',
            background: '#33FFCC',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '16px',
            boxShadow: '0 6px 20px rgba(51,255,204,0.4)'
          }}
        >
          <i className='fas fa-sign-in-alt me-2'></i>Đăng Nhập
        </Button>
      </Form>

      {/* MỚI (B11): Đăng nhập với Google */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#666' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }}></div>
        <span style={{ padding: '0 12px', fontSize: '13px' }}>hoặc</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }}></div>
      </div>
      <Button
        onClick={() => { window.location.href = '/api/users/auth/google' }}
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#3c4043',
          fontWeight: '600',
          padding: '14px',
          borderRadius: '12px',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        <img
          src='https://developers.google.com/identity/images/g-logo.png'
          alt='Google'
          style={{ width: 18, height: 18 }}
        />
        Đăng Nhập Với Google
      </Button>

      <Row style={{ marginTop: '2rem' }}>
        <Col style={{ textAlign: 'center', color: '#b8bcc8' }}>
          Chưa Có Tài Khoản?{' '}
          <Link to={redirect ? `/register?redirect=${redirect}` : '/register'} style={{ 
            color: '#33FFCC', 
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Đăng Ký Ngay
          </Link>
        </Col>
      </Row>
      <Row style={{ marginTop: '1rem' }}>
        <Col style={{ textAlign: 'center' }}>
          <Link to='/forgotpassword' style={{ 
            color: '#33FFCC', 
            fontWeight: '500',
            textDecoration: 'none'
          }}>
            <i className='fas fa-key me-1'></i>Quên Mật Khẩu?
          </Link>
        </Col>
      </Row>
    </FormContainer>
  )
}

export default LoginScreen