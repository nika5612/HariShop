import axios from 'axios'
import {
  ORDER_CREATE_REQUEST,
  ORDER_CREATE_SUCCESS,
  ORDER_CREATE_FAIL,
  ORDER_DETAILS_FAIL,
  ORDER_DETAILS_SUCCESS,
  ORDER_DETAILS_REQUEST,
  ORDER_PAY_FAIL,
  ORDER_PAY_SUCCESS,
  ORDER_PAY_REQUEST,
  ORDER_COD_PAYMENT_REQUEST,
  ORDER_COD_PAYMENT_SUCCESS,
  ORDER_COD_PAYMENT_FAIL,
  ORDER_LIST_MY_REQUEST,
  ORDER_LIST_MY_SUCCESS,
  ORDER_LIST_MY_FAIL,
  ORDER_LIST_FAIL,
  ORDER_LIST_SUCCESS,
  ORDER_LIST_REQUEST,
  ORDER_DELIVER_FAIL,
  ORDER_DELIVER_SUCCESS,
  ORDER_DELIVER_REQUEST,
  ORDER_CANCEL_REQUEST_REQUEST,
  ORDER_CANCEL_REQUEST_SUCCESS,
  ORDER_CANCEL_REQUEST_FAIL,
  ORDER_APPROVE_CANCEL_REQUEST,
  ORDER_APPROVE_CANCEL_SUCCESS,
  ORDER_APPROVE_CANCEL_FAIL,
  ORDER_REJECT_CANCEL_REQUEST,
  ORDER_REJECT_CANCEL_SUCCESS,
  ORDER_REJECT_CANCEL_FAIL,
  ORDER_TRACK_REQUEST,
  ORDER_TRACK_SUCCESS,
  ORDER_TRACK_FAIL,
  ORDER_UPDATE_STATUS_REQUEST,
  ORDER_UPDATE_STATUS_SUCCESS,
  ORDER_UPDATE_STATUS_FAIL,
  ORDER_REFUND_REQUEST_REQUEST,
  ORDER_REFUND_REQUEST_SUCCESS,
  ORDER_REFUND_REQUEST_FAIL,
  ORDER_REFUND_COMPLETE_REQUEST,
  ORDER_REFUND_COMPLETE_SUCCESS,
  ORDER_REFUND_COMPLETE_FAIL,
} from '../constants/orderConstants'



import { logout } from './userActions'

const getErrorMessage = (error) => {
  try {
    return error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message
  } catch (e) {
    return error.message || 'Đã xảy ra lỗi'
  }
}

export const createOrder = (order) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_CREATE_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.post(`/api/orders`, order, config)

    dispatch({ type: ORDER_CREATE_SUCCESS, payload: data })

    // Xoá khỏi cart chỉ những item đã mua
    // order.orderItems được frontend gửi lên theo danh sách đã tick
    const purchasedItems = Array.isArray(order?.orderItems) ? order.orderItems : []
    dispatch({
      type: 'CART_REMOVE_PURCHASED_ITEMS',
      payload: { purchasedItems },
    })

    // cập nhật localStorage tương ứng
    // (cart reducer sẽ cập nhật cart.cartItems; phần localStorage này giúp đồng bộ ngay lập tức)
    const state = getState()
    const remaining = (state.cart.cartItems || []).filter((ci) => {
      return !purchasedItems.some(
        (pi) =>
          pi.product === ci.product &&
          (pi.color || '') === (ci.color || '')
      )
    })
    localStorage.setItem('cartItems', JSON.stringify(remaining))

    localStorage.removeItem('deliveryMethod')
    localStorage.removeItem('voucherCode')
    localStorage.removeItem('shopMessage')
    localStorage.removeItem('deliveryFee')
    localStorage.removeItem('voucherDiscount')

  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_CREATE_FAIL, payload: message })
  }
}

export const getOrderDetails = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_DETAILS_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders/${id}`, config)

    dispatch({ type: ORDER_DETAILS_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_DETAILS_FAIL, payload: message })
  }
}

export const payOrder = (orderId, paymentResult) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_PAY_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/pay`, paymentResult, config)

    dispatch({ type: ORDER_PAY_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_PAY_FAIL, payload: message })
  }
}

// MỚI: Admin đánh dấu đã thu/chưa thu tiền cho đơn COD
export const updateCodPaymentStatus = (orderId, isPaid) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_COD_PAYMENT_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/cod-payment`, { isPaid }, config)

    dispatch({ type: ORDER_COD_PAYMENT_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_COD_PAYMENT_FAIL, payload: message })
  }
}

export const deliverOrder = (order) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_DELIVER_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.put(`/api/orders/${order._id}/deliver`, {}, config)

    dispatch({ type: ORDER_DELIVER_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_DELIVER_FAIL, payload: message })
  }
}

// ✅ A3: Admin cập nhật trạng thái đơn hàng chi tiết (timeline)
export const updateOrderStatus = (orderId, status, note = '') => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_UPDATE_STATUS_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(
      `/api/orders/${orderId}/status`,
      { status, note },
      config
    )

    dispatch({ type: ORDER_UPDATE_STATUS_SUCCESS, payload: data })
    dispatch({ type: ORDER_DETAILS_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_UPDATE_STATUS_FAIL, payload: message })
  }
}

// ✅ A5: Khách gửi yêu cầu hoàn tiền
export const requestRefund = (orderId, bankInfo) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_REFUND_REQUEST_REQUEST })

    const { userLogin: { userInfo } } = getState()
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/refund-request`, bankInfo, config)

    dispatch({ type: ORDER_REFUND_REQUEST_SUCCESS, payload: data })
    dispatch({ type: ORDER_DETAILS_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_REFUND_REQUEST_FAIL, payload: message })
  }
}

// ✅ A5: Admin đánh dấu đã hoàn tiền
export const completeRefund = (orderId, refundAmount, note) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_REFUND_COMPLETE_REQUEST })

    const { userLogin: { userInfo } } = getState()
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(
      `/api/orders/${orderId}/refund-complete`,
      { refundAmount, note },
      config
    )

    dispatch({ type: ORDER_REFUND_COMPLETE_SUCCESS, payload: data })
    dispatch({ type: ORDER_DETAILS_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_REFUND_COMPLETE_FAIL, payload: message })
  }
}

export const listMyOrders = () => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_LIST_MY_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders/myorders`, config)

    dispatch({ type: ORDER_LIST_MY_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_LIST_MY_FAIL, payload: message })
  }
}

export const listOrders = () => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_LIST_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders`, config)

    dispatch({ type: ORDER_LIST_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_LIST_FAIL, payload: message })
  }
}

export const cancelOrderRequest = (orderId, reason) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_CANCEL_REQUEST_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/cancel-request`, { reason }, config)

    dispatch({ type: ORDER_CANCEL_REQUEST_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_CANCEL_REQUEST_FAIL, payload: message })
  }
}

export const approveCancelOrder = (orderId) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_APPROVE_CANCEL_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/approve-cancel`, {}, config)

    dispatch({ type: ORDER_APPROVE_CANCEL_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_APPROVE_CANCEL_FAIL, payload: message })
  }
}

export const rejectCancelOrder = (orderId) => async (dispatch, getState) => {
  try {
    dispatch({ type: ORDER_REJECT_CANCEL_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.put(`/api/orders/${orderId}/reject-cancel`, {}, config)

    dispatch({ type: ORDER_REJECT_CANCEL_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_REJECT_CANCEL_FAIL, payload: message })
  }
}


export const trackOrder = (orderId) => async (dispatch, getState) => {

  try {
    dispatch({ type: ORDER_TRACK_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    const { data } = await axios.get(`/api/orders/${orderId}/track`, config)

    dispatch({ type: ORDER_TRACK_SUCCESS, payload: data })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: ORDER_TRACK_FAIL, payload: message })
  }
}