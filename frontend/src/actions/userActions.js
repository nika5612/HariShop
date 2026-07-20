import axios from 'axios'
import {
  USER_DETAILS_FAIL,
  USER_DETAILS_REQUEST,
  USER_DETAILS_SUCCESS,
  USER_LOGIN_FAIL,
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGOUT,
  USER_REGISTER_FAIL,
  USER_REGISTER_REQUEST,
  USER_REGISTER_SUCCESS,
  USER_UPDATE_PROFILE_FAIL,
  USER_UPDATE_PROFILE_REQUEST,
  USER_UPDATE_PROFILE_SUCCESS,
  USER_DETAILS_RESET,
  USER_LIST_FAIL,
  USER_LIST_SUCCESS,
  USER_LIST_REQUEST,
  USER_LIST_RESET,
  USER_UNLOCK_COD_REQUEST,
  USER_UNLOCK_COD_SUCCESS,
  USER_UNLOCK_COD_FAIL,
  USER_DELETE_REQUEST,
  USER_DELETE_SUCCESS,
  USER_DELETE_FAIL,
  USER_UPDATE_FAIL,
  USER_UPDATE_SUCCESS,
  USER_UPDATE_REQUEST,
  USER_VERIFY_OTP_REQUEST,
  USER_VERIFY_OTP_SUCCESS,
  USER_VERIFY_OTP_FAIL,
  USER_RESEND_OTP_REQUEST,
  USER_RESEND_OTP_SUCCESS,
  USER_RESEND_OTP_FAIL,
  USER_CHANGE_PWD_REQUEST_OTP_REQUEST,
  USER_CHANGE_PWD_REQUEST_OTP_SUCCESS,
  USER_CHANGE_PWD_REQUEST_OTP_FAIL,
  USER_CHANGE_PWD_VERIFY_OTP_REQUEST,
  USER_CHANGE_PWD_VERIFY_OTP_SUCCESS,
  USER_CHANGE_PWD_VERIFY_OTP_FAIL,
} from '../constants/userConstants'
import { ORDER_LIST_MY_RESET } from '../constants/orderConstants'

export const USER_FORGOT_PASSWORD_REQUEST = 'USER_FORGOT_PASSWORD_REQUEST'
export const USER_FORGOT_PASSWORD_SUCCESS = 'USER_FORGOT_PASSWORD_SUCCESS'
export const USER_FORGOT_PASSWORD_FAIL = 'USER_FORGOT_PASSWORD_FAIL'

export const USER_RESET_PASSWORD_REQUEST = 'USER_RESET_PASSWORD_REQUEST'
export const USER_RESET_PASSWORD_SUCCESS = 'USER_RESET_PASSWORD_SUCCESS'
export const USER_RESET_PASSWORD_FAIL = 'USER_RESET_PASSWORD_FAIL'

// LOGIN
export const login = (email, password) => async (dispatch) => {
  try {
    dispatch({ type: USER_LOGIN_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.post(
      '/api/users/login',
      { email, password },
      config
    )

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    })

    localStorage.setItem('userInfo', JSON.stringify(data))
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

// LOGIN VỚI GOOGLE (B11)
// FE nhận `token` (JWT) từ query string sau khi BE redirect từ Google callback,
// dùng token đó gọi /api/users/profile để lấy đủ thông tin user rồi lưu như
// login thường (localStorage + USER_LOGIN_SUCCESS).
export const loginWithGoogleToken = (token) => async (dispatch) => {
  try {
    dispatch({ type: USER_LOGIN_REQUEST })

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    }

    const { data } = await axios.get('/api/users/profile', config)

    const userData = { ...data, token }

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: userData,
    })

    localStorage.setItem('userInfo', JSON.stringify(userData))
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

// LOGOUT
export const logout = () => (dispatch) => {
  localStorage.removeItem('userInfo')
  localStorage.removeItem('cartItems')
  localStorage.removeItem('shippingAddress')
  localStorage.removeItem('paymentMethod')

  dispatch({ type: USER_LOGOUT })
  dispatch({ type: USER_DETAILS_RESET })
  dispatch({ type: ORDER_LIST_MY_RESET })
  dispatch({ type: USER_LIST_RESET })

  document.location.href = '/login'
}

// REGISTER - Updated for structured address
// A2: Không tự đăng nhập ngay nữa, tài khoản cần xác nhận OTP trước.
export const register = (name, phone, email, password, addressObj) => async (dispatch) => {
  try {
    dispatch({ type: USER_REGISTER_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.post(
      '/api/users',
      { name, phone, email, password, address: addressObj },
      config
    )

    dispatch({
      type: USER_REGISTER_SUCCESS,
      payload: data,
    })
  } catch (error) {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Registration failed'
    dispatch({
      type: USER_REGISTER_FAIL,
      payload: message,
    })
  }
}

// VERIFY OTP - xác nhận email sau khi đăng ký, tự động đăng nhập nếu thành công
export const verifyOtp = (email, otp) => async (dispatch) => {
  try {
    dispatch({ type: USER_VERIFY_OTP_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.post('/api/users/verify-otp', { email, otp }, config)

    dispatch({ type: USER_VERIFY_OTP_SUCCESS, payload: data })

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    })

    localStorage.setItem('userInfo', JSON.stringify(data))
  } catch (error) {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Xác nhận OTP thất bại'
    dispatch({
      type: USER_VERIFY_OTP_FAIL,
      payload: message,
    })
  }
}

// RESEND OTP - gửi lại mã OTP (cooldown xử lý ở backend)
export const resendOtp = (email) => async (dispatch) => {
  try {
    dispatch({ type: USER_RESEND_OTP_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.post('/api/users/resend-otp', { email }, config)

    dispatch({ type: USER_RESEND_OTP_SUCCESS, payload: data })
  } catch (error) {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Gửi lại OTP thất bại'
    dispatch({
      type: USER_RESEND_OTP_FAIL,
      payload: message,
    })
  }
}

// ===== B12: Đổi mật khẩu yêu cầu xác nhận OTP qua email =====
// Bước 1: gửi mật khẩu mới (chỉ để server validate độ dài) → server gửi OTP về email
export const requestChangePasswordOtp = (newPassword) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_CHANGE_PWD_REQUEST_OTP_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.post(
      '/api/users/change-password/request-otp',
      { newPassword },
      config
    )

    dispatch({ type: USER_CHANGE_PWD_REQUEST_OTP_SUCCESS, payload: data })
  } catch (error) {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Gửi mã OTP thất bại'
    dispatch({ type: USER_CHANGE_PWD_REQUEST_OTP_FAIL, payload: message })
  }
}

// Bước 2: gửi lại mã OTP + mật khẩu mới → server xác thực rồi mới thực sự đổi
export const verifyChangePasswordOtp = (otp, newPassword) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_CHANGE_PWD_VERIFY_OTP_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.post(
      '/api/users/change-password/verify-otp',
      { otp, newPassword },
      config
    )

    dispatch({ type: USER_CHANGE_PWD_VERIFY_OTP_SUCCESS, payload: data })
  } catch (error) {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Xác nhận OTP thất bại'
    dispatch({ type: USER_CHANGE_PWD_VERIFY_OTP_FAIL, payload: message })
  }
}

// GET USER DETAILS
export const getUserDetails = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_DETAILS_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.get(`/api/users/${id}`, config)

    dispatch({
      type: USER_DETAILS_SUCCESS,
      payload: data,
    })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: USER_DETAILS_FAIL,
      payload: message,
    })
  }
}

// UPDATE PROFILE
export const updateUserProfile = (user) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_UPDATE_PROFILE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put('/api/users/profile', user, config)

    dispatch({
      type: USER_UPDATE_PROFILE_SUCCESS,
      payload: data,
    })

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    })

    localStorage.setItem('userInfo', JSON.stringify(data))
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: USER_UPDATE_PROFILE_FAIL,
      payload: message,
    })
  }
}

// ADMIN - LIST USERS (Admin-only endpoint)
// MỚI: nhận thêm { sortBy, order } (click-to-sort kiểu FC Online).
// Không truyền gì vẫn hoạt động như cũ (giữ tương thích ngược).
export const listUsers = ({ sortBy = '', order = '' } = {}) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_LIST_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    // Prevent non-admin calls
    if (!userInfo?.isAdmin) {
      dispatch({
        type: USER_LIST_FAIL,
        payload: 'Admin permissions required',
      })
      return
    }

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    let query = '/api/users'
    if (sortBy && order) query += `?sortBy=${sortBy}&order=${order}`

    const { data } = await axios.get(query, config)

    dispatch({
      type: USER_LIST_SUCCESS,
      payload: data,
    })
  } catch (error) {
    // Safe error parsing like orderActions.js
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'Server error'

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: USER_LIST_FAIL,
      payload: message,
    })
  }
}

// ADMIN - DELETE USER
export const deleteUser = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_DELETE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    await axios.delete(`/api/users/${id}`, config)

    dispatch({ type: USER_DELETE_SUCCESS })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: USER_DELETE_FAIL,
      payload: message,
    })
  }
}

// ADMIN - UPDATE USER
export const updateUser = (user) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_UPDATE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/users/${user._id}`, user, config)

    dispatch({ type: USER_UPDATE_SUCCESS })
    dispatch({ type: USER_DETAILS_SUCCESS, payload: data })
    dispatch({ type: USER_DETAILS_RESET })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: USER_UPDATE_FAIL,
      payload: message,
    })
  }
}

// FORGOT PASSWORD
export const forgotPassword = (email) => async (dispatch) => {
  try {
    dispatch({ type: USER_FORGOT_PASSWORD_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.post('/api/users/forgotpassword', { email }, config)

    dispatch({ type: USER_FORGOT_PASSWORD_SUCCESS, payload: data })
  } catch (error) {
    dispatch({
      type: USER_FORGOT_PASSWORD_FAIL,
      payload: error.response && error.response.data.message ? error.response.data.message : error.message,
    })
  }
}

// RESET PASSWORD
export const resetPassword = (token, password) => async (dispatch) => {
  try {
    dispatch({ type: USER_RESET_PASSWORD_REQUEST })

    const config = {
      headers: { 'Content-Type': 'application/json' },
    }

    const { data } = await axios.put(`/api/users/resetpassword/${token}`, { password }, config)

    dispatch({ type: USER_RESET_PASSWORD_SUCCESS, payload: data })
  } catch (error) {
    dispatch({
      type: USER_RESET_PASSWORD_FAIL,
      payload: error.response && error.response.data.message ? error.response.data.message : error.message,
    })
  }
}

// ===== B1: Admin mở khóa COD thủ công cho một tài khoản =====
export const unlockCod = (userId) => async (dispatch, getState) => {
  try {
    dispatch({ type: USER_UNLOCK_COD_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/users/${userId}/unlock-cod`, {}, config)

    dispatch({ type: USER_UNLOCK_COD_SUCCESS, payload: data })
  } catch (error) {
    dispatch({
      type: USER_UNLOCK_COD_FAIL,
      payload: error.response && error.response.data.message ? error.response.data.message : error.message,
    })
  }
}