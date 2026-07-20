import axios from 'axios'
import {
  VOUCHER_AVAILABLE_LIST_REQUEST,
  VOUCHER_AVAILABLE_LIST_SUCCESS,
  VOUCHER_AVAILABLE_LIST_FAIL,
  VOUCHER_VALIDATE_REQUEST,
  VOUCHER_VALIDATE_SUCCESS,
  VOUCHER_VALIDATE_FAIL,
  VOUCHER_VALIDATE_RESET,
} from '../constants/voucherConstants'

// ══════════════════════════════════════════════════════════════════
// MỚI: action Redux dành cho TRẢI NGHIỆM KHÁCH HÀNG (popup chọn voucher
// ở CheckoutScreen) — khác voucherAdminActions.js vốn chỉ dành cho admin
// quản lý (CRUD voucher).
// ══════════════════════════════════════════════════════════════════

// Lấy danh sách voucher công khai, kèm sẵn eligible/discountAmount tính
// theo giỏ hàng hiện tại (orderAmount, shippingFee, categories).
export const listAvailableVouchers =
  ({ orderAmount = 0, shippingFee = 0, categories = [] } = {}) =>
  async (dispatch, getState) => {
    try {
      dispatch({ type: VOUCHER_AVAILABLE_LIST_REQUEST })

      const { userLogin: { userInfo } } = getState()
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

      let query = `/api/vouchers/available?orderAmount=${orderAmount}&shippingFee=${shippingFee}`
      if (categories.length > 0) query += `&categories=${categories.join(',')}`

      const { data } = await axios.get(query, config)

      dispatch({ type: VOUCHER_AVAILABLE_LIST_SUCCESS, payload: data })
    } catch (error) {
      dispatch({
        type: VOUCHER_AVAILABLE_LIST_FAIL,
        payload: error.response?.data?.message || error.message,
      })
    }
  }

// Validate 1 mã (nhập tay HOẶC tự động re-check khi giỏ hàng đổi).
export const validateVoucherCode =
  ({ code, orderAmount, shippingFee = 0, categories = [] }) =>
  async (dispatch, getState) => {
    try {
      dispatch({ type: VOUCHER_VALIDATE_REQUEST })

      const { userLogin: { userInfo } } = getState()
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

      const { data } = await axios.post(
        '/api/vouchers/validate',
        { code, orderAmount, shippingFee, categories },
        config
      )

      dispatch({ type: VOUCHER_VALIDATE_SUCCESS, payload: data })
      return data
    } catch (error) {
      const message = error.response?.data?.message || error.message
      dispatch({ type: VOUCHER_VALIDATE_FAIL, payload: message })
      throw new Error(message)
    }
  }

export const resetVoucherValidate = () => (dispatch) => {
  dispatch({ type: VOUCHER_VALIDATE_RESET })
}