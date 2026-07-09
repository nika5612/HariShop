import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { verifyOtp, resendOtp } from '../actions/userActions'
import { USER_VERIFY_OTP_RESET } from '../constants/userConstants'

const RESEND_COOLDOWN_SECONDS = 60

const inputStyle = {
  background: '#0f0f23',
  border: '1px solid rgba(51,255,204,0.4)',
  color: '#ffffff',
  borderRadius: '12px',
  padding: '14px 16px',
  textAlign: 'center',
  fontSize: '28px',
  letterSpacing: '10px',
  fontWeight: '700',
}

const VerifyOtpScreen = ({ location, history }) => {
  const query = new URLSearchParams(location.search)
  const email = query.get('email') || ''

  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef(null)

  const dispatch = useDispatch()

  const userVerifyOtp = useSelector((state) => state.userVerifyOtp)
  const { loading, error, success } = userVerifyOtp

  const userResendOtp = useSelector((state) => state.userResendOtp)
  const { loading: loadingResend, error: resendError, success: resendSuccess, data: resendData } =
    userResendOtp

  useEffect(() => {
    if (!email) {
      history.push('/register')
    }
  }, [email, history])

  useEffect(() => {
    if (success) {
      dispatch({ type: USER_VERIFY_OTP_RESET })
      history.push('/')
    }
  }, [success, history, dispatch])

  useEffect(() => {
    if (resendSuccess) {
      setCooldown(resendData?.cooldownSeconds || RESEND_COOLDOWN_SECONDS)
    }
  }, [resendSuccess, resendData])

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [cooldown])

  const submitHandler = (e) => {
    e.preventDefault()
    if (otp.trim().length !== 6) return
    dispatch(verifyOtp(email, otp.trim()))
  }

  const resendHandler = () => {
    if (cooldown > 0 || loadingResend) return
    dispatch(resendOtp(email))
  }

  return (
    <FormContainer>
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '0.5rem' }}>
        <i className='fas fa-envelope-open-text me-3' style={{ color: '#33FFCC' }}></i>
        Xác Nhận Email
      </h1>
      <p style={{ color: '#b8bcc8', marginBottom: '1.5rem' }}>
        Mã OTP gồm 6 chữ số đã được gửi đến <strong style={{ color: '#33FFCC' }}>{email}</strong>.
        Mã có hiệu lực trong 10 phút.
      </p>

      {error && <Message variant='danger'>{error}</Message>}
      {resendError && <Message variant='danger'>{resendError}</Message>}
      {resendSuccess && <Message variant='success'>{resendData?.message}</Message>}
      {loading && <Loader />}

      <Form onSubmit={submitHandler}>
        <Form.Group controlId='otp' style={{ marginBottom: '1.5rem' }}>
          <Form.Control
            type='text'
            inputMode='numeric'
            placeholder='------'
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            autoFocus
            style={inputStyle}
          />
        </Form.Group>

        <Button
          type='submit'
          disabled={otp.length !== 6 || loading}
          style={{
            width: '100%',
            background:
              otp.length !== 6 || loading ? '#666' : 'linear-gradient(135deg, #33FFCC, #00D4AA)',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '16px',
            marginBottom: '1rem',
            opacity: otp.length !== 6 || loading ? 0.7 : 1,
            cursor: otp.length !== 6 || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Đang xác nhận...' : 'Xác Nhận'}
        </Button>

        <Button
          type='button'
          onClick={resendHandler}
          disabled={cooldown > 0 || loadingResend}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(51,255,204,0.4)',
            color: cooldown > 0 ? '#666' : '#33FFCC',
            fontWeight: '600',
            padding: '14px',
            borderRadius: '12px',
          }}
        >
          {loadingResend
            ? 'Đang gửi...'
            : cooldown > 0
            ? `Gửi lại mã sau ${cooldown}s`
            : 'Gửi lại mã OTP'}
        </Button>
      </Form>

      <Row style={{ marginTop: '2rem' }}>
        <Col style={{ textAlign: 'center', color: '#b8bcc8' }}>
          Nhập sai email? <Link to='/register' style={{ color: '#33FFCC' }}>Đăng ký lại</Link>
        </Col>
      </Row>
    </FormContainer>
  )
}

export default VerifyOtpScreen