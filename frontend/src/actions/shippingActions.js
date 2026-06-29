import axios from 'axios'
import {
  SHIPPING_QUOTES_REQUEST,
  SHIPPING_QUOTES_SUCCESS,
  SHIPPING_QUOTES_FAIL,
  SHIPPING_TRACK_REQUEST,
  SHIPPING_TRACK_SUCCESS,
  SHIPPING_TRACK_FAIL,
} from '../constants/shippingConstants'

const safeErrorMessage = (error) => {
  const data = error?.response?.data
  if (data && typeof data === 'object' && data.message) return data.message
  if (typeof data === 'string' && data.trim() && data.trim() !== 'undefined') return data
  return error?.message || 'Request failed'
}

export const getShippingQuotes = (cartItems, toAddress) => async (dispatch) => {
  try {
    dispatch({ type: SHIPPING_QUOTES_REQUEST })
    const { data } = await axios.post('/api/shipping/quotes', { cartItems, toAddress })
    dispatch({ type: SHIPPING_QUOTES_SUCCESS, payload: data?.quotes || [] })
  } catch (error) {
    dispatch({ type: SHIPPING_QUOTES_FAIL, payload: safeErrorMessage(error) })
  }
}

export const trackShipping = (carrier, trackingId) => async (dispatch) => {
  try {
    dispatch({ type: SHIPPING_TRACK_REQUEST })
    const { data } = await axios.get(`/api/shipping/track/${carrier}/${trackingId}`)
    dispatch({ type: SHIPPING_TRACK_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: SHIPPING_TRACK_FAIL, payload: safeErrorMessage(error) })
  }
}

