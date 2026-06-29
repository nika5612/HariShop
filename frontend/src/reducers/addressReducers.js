import {
  ADDRESS_ADD_REQUEST,
  ADDRESS_ADD_SUCCESS,
  ADDRESS_ADD_FAIL,
  ADDRESS_LIST_REQUEST,
  ADDRESS_LIST_SUCCESS,
  ADDRESS_LIST_FAIL,
  ADDRESS_DELETE_REQUEST,
  ADDRESS_DELETE_SUCCESS,
  ADDRESS_DELETE_FAIL,
  ADDRESS_SET_DEFAULT_REQUEST,
  ADDRESS_SET_DEFAULT_SUCCESS,
  ADDRESS_SET_DEFAULT_FAIL,
  ADDRESS_RESET,
} from '../constants/addressConstants'

const initialState = {
  addresses: [],
  loading: false,
  success: false,
  error: null,
}

export const addressReducer = (state = initialState, action) => {
  switch (action.type) {
    /* ===================== REQUEST ===================== */
    case ADDRESS_LIST_REQUEST:
    case ADDRESS_ADD_REQUEST:
    case ADDRESS_DELETE_REQUEST:
    case ADDRESS_SET_DEFAULT_REQUEST:
      return {
        ...state,
        loading: true,
        success: false,
        error: null,
      }

    /* ===================== SUCCESS ===================== */
    case ADDRESS_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        success: false,
        addresses: action.payload,
      }

    case ADDRESS_ADD_SUCCESS:
    case ADDRESS_DELETE_SUCCESS:
    case ADDRESS_SET_DEFAULT_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        addresses: action.payload,
      }

    /* ===================== FAIL ===================== */
    case ADDRESS_LIST_FAIL:
    case ADDRESS_ADD_FAIL:
    case ADDRESS_DELETE_FAIL:
    case ADDRESS_SET_DEFAULT_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      }

    /* ===================== RESET ===================== */
    case ADDRESS_RESET:
      return initialState

    default:
      return state
  }
}