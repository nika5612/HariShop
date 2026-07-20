import {
  VOUCHER_LIST_REQUEST,
  VOUCHER_LIST_SUCCESS,
  VOUCHER_LIST_FAIL,
  VOUCHER_CREATE_REQUEST,
  VOUCHER_CREATE_SUCCESS,
  VOUCHER_CREATE_FAIL,
  VOUCHER_CREATE_RESET,
  VOUCHER_UPDATE_REQUEST,
  VOUCHER_UPDATE_SUCCESS,
  VOUCHER_UPDATE_FAIL,
  VOUCHER_UPDATE_RESET,
  VOUCHER_DELETE_REQUEST,
  VOUCHER_DELETE_SUCCESS,
  VOUCHER_DELETE_FAIL,
  VOUCHER_DELETE_RESET,
  VOUCHER_AVAILABLE_LIST_REQUEST,
  VOUCHER_AVAILABLE_LIST_SUCCESS,
  VOUCHER_AVAILABLE_LIST_FAIL,
  VOUCHER_VALIDATE_REQUEST,
  VOUCHER_VALIDATE_SUCCESS,
  VOUCHER_VALIDATE_FAIL,
  VOUCHER_VALIDATE_RESET,
} from '../constants/voucherConstants'

export const voucherListReducer = (state = { vouchers: [] }, action) => {
  switch (action.type) {
    case VOUCHER_LIST_REQUEST:
      return { loading: true, vouchers: [] }
    case VOUCHER_LIST_SUCCESS:
      return { loading: false, vouchers: action.payload }
    case VOUCHER_LIST_FAIL:
      return { loading: false, error: action.payload, vouchers: [] }
    default:
      return state
  }
}

export const voucherCreateReducer = (state = {}, action) => {
  switch (action.type) {
    case VOUCHER_CREATE_REQUEST:
      return { loading: true }
    case VOUCHER_CREATE_SUCCESS:
      return { loading: false, success: true, voucher: action.payload }
    case VOUCHER_CREATE_FAIL:
      return { loading: false, error: action.payload }
    case VOUCHER_CREATE_RESET:
      return {}
    default:
      return state
  }
}

export const voucherUpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case VOUCHER_UPDATE_REQUEST:
      return { loading: true }
    case VOUCHER_UPDATE_SUCCESS:
      return { loading: false, success: true, voucher: action.payload }
    case VOUCHER_UPDATE_FAIL:
      return { loading: false, error: action.payload }
    case VOUCHER_UPDATE_RESET:
      return {}
    default:
      return state
  }
}

export const voucherDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case VOUCHER_DELETE_REQUEST:
      return { loading: true }
    case VOUCHER_DELETE_SUCCESS:
      return { loading: false, success: true, result: action.payload }
    case VOUCHER_DELETE_FAIL:
      return { loading: false, error: action.payload }
    case VOUCHER_DELETE_RESET:
      return {}
    default:
      return state
  }
}

// ── MỚI: danh sách voucher khả dụng cho khách xem ở popup checkout ──
export const voucherAvailableListReducer = (state = { vouchers: [] }, action) => {
  switch (action.type) {
    case VOUCHER_AVAILABLE_LIST_REQUEST:
      return { ...state, loading: true }
    case VOUCHER_AVAILABLE_LIST_SUCCESS:
      return { loading: false, vouchers: action.payload }
    case VOUCHER_AVAILABLE_LIST_FAIL:
      return { loading: false, error: action.payload, vouchers: [] }
    default:
      return state
  }
}

// ── MỚI: validate 1 mã voucher (nhập tay hoặc tự động re-check giỏ hàng) ──
export const voucherValidateReducer = (state = {}, action) => {
  switch (action.type) {
    case VOUCHER_VALIDATE_REQUEST:
      return { loading: true }
    case VOUCHER_VALIDATE_SUCCESS:
      return { loading: false, success: true, result: action.payload }
    case VOUCHER_VALIDATE_FAIL:
      return { loading: false, success: false, error: action.payload }
    case VOUCHER_VALIDATE_RESET:
      return {}
    default:
      return state
  }
}