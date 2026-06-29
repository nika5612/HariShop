import { createStore, combineReducers, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { composeWithDevTools } from 'redux-devtools-extension'


import {
  productListReducer,
  productDetailsReducer,
  productDeleteReducer,
  productCreateReducer,
  productUpdateReducer,
  productReviewCreateReducer,
  productTopRatedReducer,
  productDeleteReviewReducer,
} from './reducers/productReducers'

// CART
import { cartReducer } from './reducers/cartReducers'

// USER
import {
  userLoginReducer,
  userRegisterReducer,
  userDetailsReducer,
  userUpdateProfileReducer,
  userListReducer,
  userDeleteReducer,
  userUpdateReducer,
  userForgotPasswordReducer,
  userResetPasswordReducer,
  userProfileReducer,
} from './reducers/userReducers'

// ORDER
import {
  orderCreateReducer,
  orderDetailsReducer,
  orderPayReducer,
  orderDeliverReducer,
  orderListMyReducer,
  orderListReducer,
  orderCancelRequestReducer,
  orderApproveCancelReducer,
  orderRejectCancelReducer,
  orderTrackReducer,
  orderAdminRevenueReducer,
  orderAdminBrandReducer,
  orderAdminDeleteReducer,
} from './reducers/orderReducers'

// VOUCHER (ADMIN)
import {
  voucherListReducer,
  voucherCreateReducer,
  voucherUpdateReducer,
  voucherDeleteReducer,
} from './reducers/voucherReducers'



// ADDRESS
import { addressReducer } from './reducers/addressReducers'
import { shippingQuotesReducer, shippingTrackReducer } from './reducers/shippingReducers'


// ================= REDUCER =================
const reducer = combineReducers({
  productList: productListReducer,
  productDetails: productDetailsReducer,
  productDelete: productDeleteReducer,
  productCreate: productCreateReducer,
  productUpdate: productUpdateReducer,
  productReviewCreate: productReviewCreateReducer,
  productTopRated: productTopRatedReducer,

  cart: cartReducer,

  userLogin: userLoginReducer,
  userRegister: userRegisterReducer,
  userDetails: userDetailsReducer,
  userUpdateProfile: userUpdateProfileReducer,
  userList: userListReducer,
  userDelete: userDeleteReducer,
  userUpdate: userUpdateReducer,

  orderCreate: orderCreateReducer,
  orderDetails: orderDetailsReducer,
  orderPay: orderPayReducer,
  orderDeliver: orderDeliverReducer,
  orderListMy: orderListMyReducer,
  orderList: orderListReducer,
  orderCancelRequest: orderCancelRequestReducer,
  orderApproveCancel: orderApproveCancelReducer,
  orderRejectCancel: orderRejectCancelReducer,
  orderTrack: orderTrackReducer,

  // ADMIN DASHBOARD
  orderAdminRevenue: orderAdminRevenueReducer,
  orderAdminBrand: orderAdminBrandReducer,
  orderAdminDelete: orderAdminDeleteReducer,

  // VOUCHER (ADMIN)
  voucherList: voucherListReducer,
  voucherCreate: voucherCreateReducer,
  voucherUpdate: voucherUpdateReducer,
  voucherDelete: voucherDeleteReducer,

  // ADDRESS BOOK
  address: addressReducer,


  productDeleteReview: productDeleteReviewReducer,
  userForgotPassword: userForgotPasswordReducer,
  userResetPassword: userResetPasswordReducer,
  userProfile: userProfileReducer,

  shippingQuotes: shippingQuotesReducer,
  shippingTrack: shippingTrackReducer,
})

// ================= LOCAL STORAGE =================
const safeParseStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key)
    if (!item || item === 'undefined' || item === 'null') {
      localStorage.removeItem(key)
      return defaultValue
    }
    const parsed = JSON.parse(item)
    if (key === 'cartItems' && !Array.isArray(parsed)) return defaultValue
    if (key === 'userInfo' && typeof parsed !== 'object') return defaultValue
    if (key === 'shippingAddress' && typeof parsed !== 'object') return defaultValue
    return parsed
  } catch (e) {
    console.warn(`Clearing corrupted localStorage for ${key}:`, e.message)
    localStorage.removeItem(key)
    return defaultValue
  }
}

const cartItemsFromStorage = safeParseStorage('cartItems', [])
const userInfoFromStorage = safeParseStorage('userInfo', null)
const shippingAddressFromStorage = safeParseStorage('shippingAddress', {})

// ================= INITIAL STATE =================
const initialState = {
  cart: {
    cartItems: cartItemsFromStorage,
    shippingAddress: shippingAddressFromStorage,
    deliveryMethod: safeParseStorage('deliveryMethod', 'nhanh'),
    voucherCode: '',
    shopMessage: '',
    deliveryFee: 20000,
    voucherDiscount: 0,
  },
  userLogin: {
    userInfo: userInfoFromStorage,
  },
}

// ================= STORE =================
const middleware = [thunk]

const store = createStore(
  reducer,
  initialState,
  composeWithDevTools(applyMiddleware(...middleware))
)

export default store
