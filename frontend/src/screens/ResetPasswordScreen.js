import React, { useState, useEffect } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { resetPassword } from '../actions/userActions'

const ResetPasswordScreen = ({ match, history }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [messageError, setMessageError] = useState('')

  const resetToken = match.params.token

  const dispatch = useDispatch()

  const userResetPassword = useSelector((state) => state.userResetPassword)
  const { loading, error, success } = userResetPassword

  useEffect(() => {
    if (success) {
      setTimeout(() => history.push('/login'), 3000)
    }
  }, [history, success])

  const submitHandler = (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessageError('Mật khẩu không khớp!')
    } else {
      setMessageError('')
      dispatch(resetPassword(resetToken, password))
    }
  }

  return (
    <FormContainer>
      <h1>Cập Nhật Mật Khẩu</h1>
      {messageError && <Message variant='danger'>{messageError}</Message>}
      {error && <Message variant='danger'>{error}</Message>}
      {success && <Message variant='success'>Đổi mật khẩu thành công! Chuyển hướng tới đăng nhập...</Message>}
      {loading && <Loader />}
      
      {!success && (
        <Form onSubmit={submitHandler}>
          <Form.Group controlId='password' className='mb-3'>
            <Form.Label>Mật khẩu mới</Form.Label>
            <Form.Control
              type='password'
              placeholder='Nhập mật khẩu mới'
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId='confirmPassword' className='mb-3'>
            <Form.Label>Xác nhận mật khẩu mới</Form.Label>
            <Form.Control
              type='password'
              placeholder='Xác nhận'
              value={confirmPassword}
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Form.Group>

          <Button type='submit' variant='primary'>
            Tiếp tục
          </Button>
        </Form>
      )}
    </FormContainer>
  )
}

export default ResetPasswordScreen
