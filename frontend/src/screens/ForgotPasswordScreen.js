import React, { useState } from 'react'
import { Form, Button, Row, Col } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { forgotPassword } from '../actions/userActions'

const validateEmail = (email) => {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return regex.test(email)
}

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('')

  const dispatch = useDispatch()

  const userForgotPassword = useSelector((state) => state.userForgotPassword)
  const { loading, error, success } = userForgotPassword

  const submitHandler = (e) => {
    e.preventDefault()
    dispatch(forgotPassword(email))
  }

  return (
    <FormContainer>
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '1.5rem' }}>
        <i className='fas fa-key me-3' style={{ color: '#33FFCC' }}></i>Quên Mật Khẩu
      </h1>
      {error && <Message variant='danger'>{error}</Message>}
      {success && <Message variant='success'>Mật khẩu mới đã được gửi vào email của bạn!</Message>}
      {loading && <Loader />}
      
      {!success && (
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
            <i className='fas fa-paper-plane me-2'></i>Gửi Mật Khẩu Mới
          </Button>
        </Form>
      )}
      
      <Row style={{ marginTop: '2rem' }}>
        <Col style={{ textAlign: 'center', color: '#b8bcc8' }}>
          <Link to='/login' style={{ 
            color: '#33FFCC', 
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            <i className='fas fa-arrow-left me-1'></i>Quay lại Đăng Nhập
          </Link>
        </Col>
      </Row>
    </FormContainer>
  )
}


export default ForgotPasswordScreen
