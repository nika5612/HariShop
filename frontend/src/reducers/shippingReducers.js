import {
  SHIPPING_QUOTES_REQUEST,
  SHIPPING_QUOTES_SUCCESS,
  SHIPPING_QUOTES_FAIL,
  SHIPPING_QUOTES_RESET,
  SHIPPING_TRACK_REQUEST,
  SHIPPING_TRACK_SUCCESS,
  SHIPPING_TRACK_FAIL,
  SHIPPING_TRACK_RESET,
} from '../constants/shippingConstants'

export const shippingQuotesReducer = (state = { quotes: [] }, action) => {
  switch (action.type) {
    case SHIPPING_QUOTES_REQUEST:
      return { loading: true, quotes: [] }
    case SHIPPING_QUOTES_SUCCESS:
      return { loading: false, quotes: action.payload || [] }
    case SHIPPING_QUOTES_FAIL:
      return { loading: false, error: action.payload, quotes: [] }
    case SHIPPING_QUOTES_RESET:
      return { quotes: [] }
    default:
      return state
  }
}

export const shippingTrackReducer = (state = { events: [] }, action) => {
  switch (action.type) {
    case SHIPPING_TRACK_REQUEST:
      return { loading: true, events: [] }
    case SHIPPING_TRACK_SUCCESS:
      return { loading: false, ...action.payload, events: action.payload?.events || [] }
    case SHIPPING_TRACK_FAIL:
      return { loading: false, error: action.payload, events: [] }
    case SHIPPING_TRACK_RESET:
      return { events: [] }
    default:
      return state
  }
}

