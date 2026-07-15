import {
  USER_DETAILS_FAIL,
  USER_DETAILS_REQUEST,
  USER_DETAILS_RESET,
  USER_DETAILS_SUCCESS,
  USER_LIST_REQUEST,
  USER_LIST_SUCCESS,
  USER_LIST_FAIL,
  USER_LIST_RESET,
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
  USER_UNLOCK_COD_REQUEST,
  USER_UNLOCK_COD_SUCCESS,
  USER_UNLOCK_COD_FAIL,
  USER_UNLOCK_COD_RESET,
  USER_DELETE_REQUEST,
  USER_DELETE_SUCCESS,
  USER_DELETE_FAIL,
  USER_UPDATE_RESET,
  USER_UPDATE_REQUEST,
  USER_UPDATE_SUCCESS,
  USER_UPDATE_FAIL,
  USER_UPDATE_PROFILE_RESET,
  USER_PROFILE_REQUEST,
  USER_PROFILE_SUCCESS,
  USER_PROFILE_FAIL,
  USER_PROFILE_RESET,
  USER_VERIFY_OTP_REQUEST,
  USER_VERIFY_OTP_SUCCESS,
  USER_VERIFY_OTP_FAIL,
  USER_VERIFY_OTP_RESET,
  USER_RESEND_OTP_REQUEST,
  USER_RESEND_OTP_SUCCESS,
  USER_RESEND_OTP_FAIL,
  USER_CHANGE_PWD_REQUEST_OTP_REQUEST,
  USER_CHANGE_PWD_REQUEST_OTP_SUCCESS,
  USER_CHANGE_PWD_REQUEST_OTP_FAIL,
  USER_CHANGE_PWD_REQUEST_OTP_RESET,
  USER_CHANGE_PWD_VERIFY_OTP_REQUEST,
  USER_CHANGE_PWD_VERIFY_OTP_SUCCESS,
  USER_CHANGE_PWD_VERIFY_OTP_FAIL,
  USER_CHANGE_PWD_VERIFY_OTP_RESET,
} from '../constants/userConstants'

export const userLoginReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_LOGIN_REQUEST:
      return { loading: true }
    case USER_LOGIN_SUCCESS:
      return { loading: false, userInfo: action.payload }
    case USER_LOGIN_FAIL:
      return { loading: false, error: action.payload }
    case USER_LOGOUT:
      return {}
    default:
      return state
  }
}

export const userRegisterReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_REGISTER_REQUEST:
      return { loading: true }
    case USER_REGISTER_SUCCESS:
      return { loading: false, userInfo: action.payload }
    case USER_REGISTER_FAIL:
      return { loading: false, error: action.payload }
    case USER_LOGOUT:
      return {}
    default:
      return state
  }
}

export const userVerifyOtpReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_VERIFY_OTP_REQUEST:
      return { loading: true }
    case USER_VERIFY_OTP_SUCCESS:
      return { loading: false, success: true, userInfo: action.payload }
    case USER_VERIFY_OTP_FAIL:
      return { loading: false, error: action.payload }
    case USER_VERIFY_OTP_RESET:
      return {}
    default:
      return state
  }
}

export const userResendOtpReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_RESEND_OTP_REQUEST:
      return { loading: true }
    case USER_RESEND_OTP_SUCCESS:
      return { loading: false, success: true, data: action.payload }
    case USER_RESEND_OTP_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

// ===== B12: Đổi mật khẩu yêu cầu xác nhận OTP qua email =====
export const userChangePasswordRequestOtpReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_CHANGE_PWD_REQUEST_OTP_REQUEST:
      return { loading: true }
    case USER_CHANGE_PWD_REQUEST_OTP_SUCCESS:
      return { loading: false, success: true, data: action.payload }
    case USER_CHANGE_PWD_REQUEST_OTP_FAIL:
      return { loading: false, error: action.payload }
    case USER_CHANGE_PWD_REQUEST_OTP_RESET:
      return {}
    default:
      return state
  }
}

export const userChangePasswordVerifyOtpReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_CHANGE_PWD_VERIFY_OTP_REQUEST:
      return { loading: true }
    case USER_CHANGE_PWD_VERIFY_OTP_SUCCESS:
      return { loading: false, success: true, data: action.payload }
    case USER_CHANGE_PWD_VERIFY_OTP_FAIL:
      return { loading: false, error: action.payload }
    case USER_CHANGE_PWD_VERIFY_OTP_RESET:
      return {}
    default:
      return state
  }
}

export const userDetailsReducer = (state = { user: {} }, action) => {
  switch (action.type) {
    case USER_DETAILS_REQUEST:
      return { ...state, loading: true }
    case USER_DETAILS_SUCCESS:
      return { loading: false, user: action.payload }
    case USER_DETAILS_FAIL:
      return { loading: false, error: action.payload }
    case USER_DETAILS_RESET:
      return { user: {} }
    default:
      return state
  }
}

export const userUpdateProfileReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_UPDATE_PROFILE_REQUEST:
      return { loading: true }
    case USER_UPDATE_PROFILE_SUCCESS:
      return { loading: false, success: true, userInfo: action.payload }
    case USER_UPDATE_PROFILE_FAIL:
      return { loading: false, error: action.payload }
    case USER_UPDATE_PROFILE_RESET:
      return {}
    default:
      return state
  }
}

export const userListReducer = (state = { users: [] }, action) => {
  switch (action.type) {
    case USER_LIST_REQUEST:
      return { loading: true }
    case USER_LIST_SUCCESS:
      return { loading: false, users: action.payload }
    case USER_LIST_FAIL:
      return { loading: false, error: action.payload }
    case USER_LIST_RESET:
      return { users: [] }
    default:
      return state
  }
}

export const userDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_DELETE_REQUEST:
      return { loading: true }
    case USER_DELETE_SUCCESS:
      return { loading: false, success: true }
    case USER_DELETE_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const userUpdateReducer = (state = { user: {} }, action) => {
  switch (action.type) {
    case USER_UPDATE_REQUEST:
      return { loading: true }
    case USER_UPDATE_SUCCESS:
      return { loading: false, success: true }
    case USER_UPDATE_FAIL:
      return { loading: false, error: action.payload }
    case USER_UPDATE_RESET:
      return {
        user: {},
      }
    default:
      return state
  }
}

export const userForgotPasswordReducer = (state = {}, action) => {
  switch (action.type) {
    case 'USER_FORGOT_PASSWORD_REQUEST':
      return { loading: true }
    case 'USER_FORGOT_PASSWORD_SUCCESS':
      return { loading: false, success: true, message: action.payload.message }
    case 'USER_FORGOT_PASSWORD_FAIL':
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const userResetPasswordReducer = (state = {}, action) => {
  switch (action.type) {
    case 'USER_RESET_PASSWORD_REQUEST':
      return { loading: true }
    case 'USER_RESET_PASSWORD_SUCCESS':
      return { loading: false, success: true, userInfo: action.payload }
    case 'USER_RESET_PASSWORD_FAIL':
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const userProfileReducer = (state = { user: {} }, action) => {
  switch (action.type) {
    case USER_PROFILE_REQUEST:
      return { ...state, loading: true }
    case USER_PROFILE_SUCCESS:
      return { loading: false, user: action.payload }
    case USER_PROFILE_FAIL:
      return { loading: false, error: action.payload }
    case USER_PROFILE_RESET:
      return { user: {} }
    default:
      return state
  }
}

// ===== B1: Admin mở khóa COD thủ công =====
export const userUnlockCodReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_UNLOCK_COD_REQUEST:
      return { loading: true }
    case USER_UNLOCK_COD_SUCCESS:
      return { loading: false, success: true, result: action.payload }
    case USER_UNLOCK_COD_FAIL:
      return { loading: false, error: action.payload }
    case USER_UNLOCK_COD_RESET:
      return {}
    default:
      return state
  }
}