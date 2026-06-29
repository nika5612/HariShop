import axios from 'axios'
import {
  CART_ADD_ITEM,
  CART_REMOVE_ITEM,
  CART_SAVE_SHIPPING_ADDRESS,
  CART_SAVE_PAYMENT_METHOD,
  CART_SAVE_DELIVERY_METHOD,
  CART_SAVE_VOUCHER_CODE,
  CART_SAVE_SHOP_MESSAGE,
  CART_SAVE_DELIVERY_FEE,
  CART_SAVE_VOUCHER_DISCOUNT,
  CART_SAVE_DELIVERY_PROVIDER,
} from '../constants/cartConstants'

export const addToCart = (id, qty, color = 'Mặc định') => async (dispatch, getState) => {
  const { data } = await axios.get(`/api/products/${id}`)

  // ── MỚI: lấy countInStock theo màu được chọn ──────────────────
  // Nếu sản phẩm có mảng colors và màu đang chọn có trong đó
  // thì lấy stock của màu đó, không lấy tổng countInStock
  let stockForColor = data.countInStock // fallback: tổng
  if (data.colors && data.colors.length > 0) {
    const colorObj = data.colors.find(
      (c) => c.name === color
    )
    if (colorObj) {
      stockForColor = colorObj.countInStock
    }
  }

  dispatch({
    type: CART_ADD_ITEM,
    payload: {
      product:      data._id,
      name:         data.name,
      image:        data.image,
      price:        data.price,
      countInStock: stockForColor, // ← stock chính xác theo màu
      weight:       data.weight,
      qty,
      color,
    },
  })

  localStorage.setItem('cartItems', JSON.stringify(getState().cart.cartItems))
}

// ── MỚI: removeFromCart nhận object {product, color} thay vì chỉ id
// để xóa đúng dòng (cùng SP nhưng khác màu là 2 dòng khác nhau)
export const removeFromCart = (productId, color = '') => (dispatch, getState) => {
  dispatch({
    type: CART_REMOVE_ITEM,
    payload: { product: productId, color },
  })
  localStorage.setItem('cartItems', JSON.stringify(getState().cart.cartItems))
}

export const saveShippingAddress = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_SHIPPING_ADDRESS, payload: data })
  localStorage.setItem('shippingAddress', JSON.stringify(data))
}

export const savePaymentMethod = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_PAYMENT_METHOD, payload: data })
  localStorage.setItem('paymentMethod', JSON.stringify(data))
}

export const saveDeliveryMethod = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_METHOD, payload: data })
  localStorage.setItem('deliveryMethod', JSON.stringify(data))
}

export const saveVoucherCode = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_VOUCHER_CODE, payload: data })
  localStorage.setItem('voucherCode', JSON.stringify(data))
}

export const saveShopMessage = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_SHOP_MESSAGE, payload: data })
  localStorage.setItem('shopMessage', JSON.stringify(data))
}

export const saveDeliveryFee = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_FEE, payload: data })
  localStorage.setItem('deliveryFee', JSON.stringify(data))
}

export const saveVoucherDiscount = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_VOUCHER_DISCOUNT, payload: data })
  localStorage.setItem('voucherDiscount', JSON.stringify(data))
}

export const saveDeliveryProvider = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_PROVIDER, payload: data })
  localStorage.setItem('deliveryProvider', JSON.stringify(data))
}