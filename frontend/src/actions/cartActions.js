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
  CART_SYNC_PRICES,
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
      // MỚI (B8): nếu đang trong thời gian Flash Sale, dùng giá đã giảm
      price:        data.isFlashSaleActive ? data.salePrice : data.price,
      countInStock: stockForColor, // ← stock chính xác theo màu
      weight:       data.weight,
      qty,
      color,
      // MỚI (B8): lưu thêm thông tin Flash Sale để hiển thị đếm ngược + giá gốc trong giỏ hàng
      isFlashSaleActive: !!data.isFlashSaleActive,
      flashSaleEndsAt:   data.isFlashSaleActive ? data.flashSaleEndsAt : null,
      discountPercent:   data.isFlashSaleActive ? data.discountPercent : null,
      originalPrice:     data.isFlashSaleActive ? data.price : null,
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

// ═══════════════════ B8: Đồng bộ lại giá giỏ hàng theo giá hiện tại ═══════════════════
// Khi Flash Sale hết hạn (hoặc giá sản phẩm đổi vì bất kỳ lý do gì), item trong giỏ
// hàng vẫn đang giữ giá CŨ tại thời điểm thêm vào. Hàm này gọi lại API sản phẩm để lấy
// giá THẬT hiện tại và tự động cập nhật giỏ hàng — đảm bảo khách luôn thấy đúng giá sẽ
// phải trả trước khi thanh toán, không bị "sốc giá" ở bước cuối.
// Trả về mảng các sản phẩm có giá bị thay đổi (để UI hiển thị thông báo nếu cần).
export const syncCartPrices = () => async (dispatch, getState) => {
  const { cart: { cartItems } } = getState()
  if (!cartItems || cartItems.length === 0) return []

  const uniqueProductIds = [...new Set(cartItems.map((i) => i.product))]

  let productMap = {}
  try {
    const results = await Promise.all(
      uniqueProductIds.map((id) =>
        axios.get(`/api/products/${id}`).then((res) => res.data).catch(() => null)
      )
    )
    results.forEach((p) => { if (p && p._id) productMap[p._id] = p })
  } catch (error) {
    // Lỗi mạng — bỏ qua, giữ nguyên giỏ hàng, backend vẫn sẽ kiểm tra lại khi đặt hàng
    return []
  }

  const changedItems = []
  let anyChanged = false
  const updatedItems = cartItems.map((item) => {
    const p = productMap[item.product]
    if (!p) return item // không lấy được thông tin (có thể sản phẩm đã bị xoá) — giữ nguyên

    const currentPrice = p.isFlashSaleActive ? p.salePrice : p.price
    const flashSaleChanged = !!item.isFlashSaleActive !== !!p.isFlashSaleActive
      || item.flashSaleEndsAt !== (p.isFlashSaleActive ? p.flashSaleEndsAt : null)

    if (currentPrice !== item.price || flashSaleChanged) {
      anyChanged = true
      if (currentPrice !== item.price) {
        changedItems.push({ name: item.name, oldPrice: item.price, newPrice: currentPrice })
      }
      return {
        ...item,
        price: currentPrice,
        isFlashSaleActive: !!p.isFlashSaleActive,
        flashSaleEndsAt:   p.isFlashSaleActive ? p.flashSaleEndsAt : null,
        discountPercent:   p.isFlashSaleActive ? p.discountPercent : null,
        originalPrice:     p.isFlashSaleActive ? p.price : null,
      }
    }
    return item
  })

  if (anyChanged) {
    dispatch({ type: CART_SYNC_PRICES, payload: updatedItems })
    localStorage.setItem('cartItems', JSON.stringify(updatedItems))
  }

  return changedItems
}