import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Loader from '../components/Loader'
import Message from '../components/Message'
import { loginWithGoogleToken } from '../actions/userActions'

const GoogleAuthScreen = ({ location, history }) => {
  const dispatch = useDispatch()
  const handled = useRef(false)

  const userLogin = useSelector((state) => state.userLogin)
  const { error, userInfo } = userLogin

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    const errorParam = params.get('error')

    if (errorParam) {
      history.push('/login')
      return
    }

    if (token) {
      dispatch(loginWithGoogleToken(token))
    } else {
      history.push('/login')
    }
  }, [dispatch, location.search, history])

  useEffect(() => {
    if (userInfo) {
      history.push('/')
    }
  }, [userInfo, history])

  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      {error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          <Loader />
          <p style={{ color: '#b8bcc8', marginTop: '1rem' }}>Đang đăng nhập bằng Google...</p>
        </>
      )}
    </div>
  )
}

export default GoogleAuthScreen