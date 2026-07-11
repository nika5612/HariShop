import axios from 'axios'
import { logout } from './userActions'
import {
  ORDER_ADMIN_REVENUE_REQUEST,
  ORDER_ADMIN_REVENUE_SUCCESS,
  ORDER_ADMIN_REVENUE_FAIL,
  ORDER_ADMIN_BRAND_REQUEST,
  ORDER_ADMIN_BRAND_SUCCESS,
  ORDER_ADMIN_BRAND_FAIL,
  ORDER_ADMIN_DELETE_REQUEST,
  ORDER_ADMIN_DELETE_SUCCESS,
  ORDER_ADMIN_DELETE_FAIL,
  REVENUE_ANALYTICS_REQUEST,
  REVENUE_ANALYTICS_SUCCESS,
  REVENUE_ANALYTICS_FAIL,
} from '../constants/orderConstants'



const getErrorMessage = (error) => {
  try {
    return error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message
  } catch (e) {
    return error.message || 'Đã xảy ra lỗi'
  }
}

export const getAdminRevenueSummary = (months = 1) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_ADMIN_REVENUE_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders/admin/revenue-summary?months=${months}`, config)

    dispatch({ type: ORDER_ADMIN_REVENUE_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_ADMIN_REVENUE_FAIL, payload: message })
  }
}

export const getAdminBrandBreakdown = (months = 1) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_ADMIN_BRAND_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders/admin/brand-breakdown?months=${months}`, config)

    dispatch({ type: ORDER_ADMIN_BRAND_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_ADMIN_BRAND_FAIL, payload: message })
  }
}

// ✅ A4: Thống kê doanh thu nâng cao — params: { period, month, year, quarter, startDate, endDate }
export const getRevenueAnalytics = (params = {}) => async (dispatch, getState) => {
  try {
    dispatch({ type: REVENUE_ANALYTICS_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const query = new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') acc[k] = v
        return acc
      }, {})
    ).toString()

    const { data } = await axios.get(`/api/orders/admin/analytics/revenue?${query}`, config)

    dispatch({ type: REVENUE_ANALYTICS_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: REVENUE_ANALYTICS_FAIL, payload: message })
  }
}

export const deleteOrderByAdmin = (orderId) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_ADMIN_DELETE_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.delete(`/api/orders/admin/${orderId}`, config)

    dispatch({ type: ORDER_ADMIN_DELETE_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_ADMIN_DELETE_FAIL, payload: message })
  }
}