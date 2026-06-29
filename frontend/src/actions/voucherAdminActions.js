import axios from 'axios'
import { logout } from './userActions'
import {
  VOUCHER_LIST_REQUEST,
  VOUCHER_LIST_SUCCESS,
  VOUCHER_LIST_FAIL,
  VOUCHER_CREATE_REQUEST,
  VOUCHER_CREATE_SUCCESS,
  VOUCHER_CREATE_FAIL,
  VOUCHER_UPDATE_REQUEST,
  VOUCHER_UPDATE_SUCCESS,
  VOUCHER_UPDATE_FAIL,
  VOUCHER_DELETE_REQUEST,
  VOUCHER_DELETE_SUCCESS,
  VOUCHER_DELETE_FAIL,
} from '../constants/voucherConstants'

const getErrorMessage = (error) => {
  try {
    return error.response?.data?.message
      ? error.response.data.message
      : error.message
  } catch (e) {
    return error.message || 'Đã xảy ra lỗi'
  }
}

export const listVouchers = () => async (dispatch, getState) => {
  try {
    dispatch({ type: VOUCHER_LIST_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get('/api/vouchers', config)

    dispatch({ type: VOUCHER_LIST_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: VOUCHER_LIST_FAIL, payload: message })
  }
}

export const createVoucher = (voucher) => async (dispatch, getState) => {
  try {
    dispatch({ type: VOUCHER_CREATE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.post('/api/vouchers', voucher, config)

    dispatch({ type: VOUCHER_CREATE_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: VOUCHER_CREATE_FAIL, payload: message })
  }
}

export const updateVoucher = (id, voucher) => async (dispatch, getState) => {
  try {
    dispatch({ type: VOUCHER_UPDATE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.put(`/api/vouchers/${id}`, voucher, config)

    dispatch({ type: VOUCHER_UPDATE_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: VOUCHER_UPDATE_FAIL, payload: message })
  }
}

export const deleteVoucher = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: VOUCHER_DELETE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.delete(`/api/vouchers/${id}`, config)

    dispatch({ type: VOUCHER_DELETE_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: VOUCHER_DELETE_FAIL, payload: message })
  }
}

