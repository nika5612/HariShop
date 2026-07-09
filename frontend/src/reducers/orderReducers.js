import {
  ORDER_CREATE_REQUEST,
  ORDER_CREATE_SUCCESS,
  ORDER_CREATE_FAIL,
  ORDER_CREATE_RESET,
  ORDER_DETAILS_REQUEST,
  ORDER_DETAILS_SUCCESS,
  ORDER_DETAILS_FAIL,
  ORDER_PAY_REQUEST,
  ORDER_PAY_FAIL,
  ORDER_PAY_SUCCESS,
  ORDER_PAY_RESET,
  ORDER_LIST_MY_REQUEST,
  ORDER_LIST_MY_SUCCESS,
  ORDER_LIST_MY_FAIL,
  ORDER_LIST_MY_RESET,
  ORDER_LIST_FAIL,
  ORDER_LIST_SUCCESS,
  ORDER_LIST_REQUEST,
  ORDER_DELIVER_FAIL,
  ORDER_DELIVER_SUCCESS,
  ORDER_DELIVER_REQUEST,
  ORDER_DELIVER_RESET,
  ORDER_CANCEL_REQUEST_REQUEST,
  ORDER_CANCEL_REQUEST_SUCCESS,
  ORDER_CANCEL_REQUEST_FAIL,
  ORDER_CANCEL_REQUEST_RESET,
  ORDER_APPROVE_CANCEL_REQUEST,
  ORDER_APPROVE_CANCEL_SUCCESS,
  ORDER_APPROVE_CANCEL_FAIL,
  ORDER_APPROVE_CANCEL_RESET,
  ORDER_REJECT_CANCEL_REQUEST,
  ORDER_REJECT_CANCEL_SUCCESS,
  ORDER_REJECT_CANCEL_FAIL,
  ORDER_REJECT_CANCEL_RESET,
  ORDER_TRACK_REQUEST,
  ORDER_TRACK_SUCCESS,
  ORDER_TRACK_FAIL,
  ORDER_TRACK_RESET,
  ORDER_ADMIN_REVENUE_REQUEST,
  ORDER_ADMIN_REVENUE_SUCCESS,
  ORDER_ADMIN_REVENUE_FAIL,
  ORDER_ADMIN_BRAND_REQUEST,
  ORDER_ADMIN_BRAND_SUCCESS,
  ORDER_ADMIN_BRAND_FAIL,
  ORDER_ADMIN_DELETE_REQUEST,
  ORDER_ADMIN_DELETE_SUCCESS,
  ORDER_ADMIN_DELETE_FAIL,
  ORDER_ADMIN_DELETE_RESET,
  ORDER_UPDATE_STATUS_REQUEST,
  ORDER_UPDATE_STATUS_SUCCESS,
  ORDER_UPDATE_STATUS_FAIL,
  ORDER_UPDATE_STATUS_RESET,
} from '../constants/orderConstants'







export const orderCreateReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_CREATE_REQUEST:
      return { loading: true }
    case ORDER_CREATE_SUCCESS:
      return { loading: false, success: true, order: action.payload }
    case ORDER_CREATE_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_CREATE_RESET:
      return {}
    default:
      return state
  }
}

export const orderDetailsReducer = (
  state = { loading: true, orderItems: [], shippingAddress: {} },
  action
) => {
  switch (action.type) {
    case ORDER_DETAILS_REQUEST:
      return { ...state, loading: true }
    case ORDER_DETAILS_SUCCESS:
      return { loading: false, order: action.payload }
    case ORDER_DETAILS_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const orderPayReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_PAY_REQUEST:
      return { loading: true }
    case ORDER_PAY_SUCCESS:
      return { loading: false, success: true }
    case ORDER_PAY_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_PAY_RESET:
      return {}
    default:
      return state
  }
}

export const orderDeliverReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_DELIVER_REQUEST:
      return { loading: true }
    case ORDER_DELIVER_SUCCESS:
      return { loading: false, success: true }
    case ORDER_DELIVER_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_DELIVER_RESET:
      return {}
    default:
      return state
  }
}

// ✅ A3: Admin cập nhật trạng thái đơn hàng chi tiết (timeline)
export const orderUpdateStatusReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_UPDATE_STATUS_REQUEST:
      return { loading: true }
    case ORDER_UPDATE_STATUS_SUCCESS:
      return { loading: false, success: true }
    case ORDER_UPDATE_STATUS_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_UPDATE_STATUS_RESET:
      return {}
    default:
      return state
  }
}

export const orderListMyReducer = (state = { orders: [] }, action) => {
  switch (action.type) {
    case ORDER_LIST_MY_REQUEST:
      return { loading: true }
    case ORDER_LIST_MY_SUCCESS:
      return { loading: false, orders: action.payload }
    case ORDER_LIST_MY_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_LIST_MY_RESET:
      return { orders: [] }
    default:
      return state
  }
}

export const orderListReducer = (state = { orders: [] }, action) => {
  switch (action.type) {
    case ORDER_LIST_REQUEST:
      return { loading: true }
    case ORDER_LIST_SUCCESS:
      return { loading: false, orders: action.payload }
    case ORDER_LIST_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const orderCancelRequestReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_CANCEL_REQUEST_REQUEST:
      return { loading: true }
    case ORDER_CANCEL_REQUEST_SUCCESS:
      return { loading: false, success: true, order: action.payload }
    case ORDER_CANCEL_REQUEST_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_CANCEL_REQUEST_RESET:
      return {}
    default:
      return state
  }
}

export const orderApproveCancelReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_APPROVE_CANCEL_REQUEST:
      return { loading: true }
    case ORDER_APPROVE_CANCEL_SUCCESS:
      return { loading: false, success: true, order: action.payload }
    case ORDER_APPROVE_CANCEL_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_APPROVE_CANCEL_RESET:
      return {}
    default:
      return state
  }
}

export const orderRejectCancelReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_REJECT_CANCEL_REQUEST:
      return { loading: true }
    case ORDER_REJECT_CANCEL_SUCCESS:
      return { loading: false, success: true, order: action.payload }
    case ORDER_REJECT_CANCEL_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_REJECT_CANCEL_RESET:
      return {}
    default:
      return state
  }
}


export const orderTrackReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_TRACK_REQUEST:
      return { loading: true }
    case ORDER_TRACK_SUCCESS:
      return { loading: false, trackingData: action.payload }
    case ORDER_TRACK_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_TRACK_RESET:
      return {}
    default:
      return state
  }
}

// ✅ Admin revenue summary reducer
export const orderAdminRevenueReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_ADMIN_REVENUE_REQUEST:
      return { loading: true }
    case ORDER_ADMIN_REVENUE_SUCCESS:
      return { loading: false, data: action.payload }
    case ORDER_ADMIN_REVENUE_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

// ✅ Admin brand breakdown reducer
export const orderAdminBrandReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_ADMIN_BRAND_REQUEST:
      return { loading: true }
    case ORDER_ADMIN_BRAND_SUCCESS:
      return { loading: false, data: action.payload }
    case ORDER_ADMIN_BRAND_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

// ✅ Admin delete order reducer
export const orderAdminDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case ORDER_ADMIN_DELETE_REQUEST:
      return { loading: true }
    case ORDER_ADMIN_DELETE_SUCCESS:
      return { loading: false, success: true, result: action.payload }
    case ORDER_ADMIN_DELETE_FAIL:
      return { loading: false, error: action.payload }
    case ORDER_ADMIN_DELETE_RESET:
      return {}
    default:
      return state
  }
}