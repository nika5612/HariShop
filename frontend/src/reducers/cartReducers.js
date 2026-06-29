import {
  CART_ADD_ITEM,
  CART_REMOVE_ITEM,
  CART_SAVE_SHIPPING_ADDRESS,
  CART_SAVE_PAYMENT_METHOD,
  CART_CLEAR_ITEMS,
  CART_SAVE_DELIVERY_METHOD,
  CART_SAVE_VOUCHER_CODE,
  CART_SAVE_SHOP_MESSAGE,
  CART_SAVE_DELIVERY_FEE,
  CART_SAVE_VOUCHER_DISCOUNT,
  CART_SAVE_DELIVERY_PROVIDER,
} from '../constants/cartConstants'

export const cartReducer = (
  state = { cartItems: [], shippingAddress: {} },
  action
) => {
  switch (action.type) {
    case CART_ADD_ITEM: {
      const item = action.payload

      // ── MỚI: check trùng theo cả product ID lẫn color ─────────
      // Cùng sản phẩm nhưng khác màu → 2 dòng riêng trong giỏ hàng
      const existItem = state.cartItems.find(
        (x) => x.product === item.product && x.color === item.color
      )

      if (existItem) {
        // Cùng SP + cùng màu → cập nhật (thay bằng item mới, qty mới)
        return {
          ...state,
          cartItems: state.cartItems.map((x) =>
            x.product === existItem.product && x.color === existItem.color
              ? item
              : x
          ),
        }
      } else {
        // SP mới hoặc màu khác → thêm vào cuối
        return {
          ...state,
          cartItems: [...state.cartItems, item],
        }
      }
    }

    case CART_REMOVE_ITEM:
      // ── MỚI: xóa theo product + color để tránh xóa nhầm màu khác
      return {
        ...state,
        cartItems: state.cartItems.filter(
          (x) =>
            !(x.product === action.payload.product &&
              x.color === action.payload.color)
        ),
      }

    case CART_SAVE_SHIPPING_ADDRESS:
      return { ...state, shippingAddress: action.payload }

    case CART_SAVE_PAYMENT_METHOD:
      return { ...state, paymentMethod: action.payload }

    case CART_SAVE_DELIVERY_METHOD:
      return { ...state, deliveryMethod: action.payload }

    case CART_SAVE_VOUCHER_CODE:
      return { ...state, voucherCode: action.payload }

    case CART_SAVE_SHOP_MESSAGE:
      return { ...state, shopMessage: action.payload }

    case CART_SAVE_DELIVERY_FEE:
      return { ...state, deliveryFee: action.payload }

    case CART_SAVE_VOUCHER_DISCOUNT:
      return { ...state, voucherDiscount: action.payload }

    case CART_SAVE_DELIVERY_PROVIDER:
      return { ...state, deliveryProvider: action.payload }

    case CART_CLEAR_ITEMS:
      return { ...state, cartItems: [] }

    default:
      return state
  }
}

export default cartReducer