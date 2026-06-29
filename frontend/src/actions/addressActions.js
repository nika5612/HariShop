import axios from 'axios'
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
} from '../constants/addressConstants'

/* ===================== LIST ADDRESSES ===================== */
// Lấy địa chỉ từ profile
export const listAddresses = () => async (dispatch, getState) => {
  try {
    dispatch({ type: ADDRESS_LIST_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.get('/api/users/profile', config)

    dispatch({
      type: ADDRESS_LIST_SUCCESS,
      payload: data.addresses,
    })
  } catch (error) {
    dispatch({
      type: ADDRESS_LIST_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

/* ===================== ADD ADDRESS ===================== */
export const addAddress = (address) => async (dispatch, getState) => {
  try {
    dispatch({ type: ADDRESS_ADD_REQUEST })

    const requiredFields = ['fullName', 'phone', 'province', 'ward', 'detail'];  // district optional for VN
    for (const field of requiredFields) {
      if (!address[field] || address[field].toString().trim() === '') {
        dispatch({
          type: ADDRESS_ADD_FAIL,
          payload: `Thiếu trường bắt buộc: ${field}`,
        });
        return;
      }
    }

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.post(
      '/api/users/addresses',
      address,
      config
    )

    dispatch({
      type: ADDRESS_ADD_SUCCESS,
      payload: data, // addresses[]
    })
  } catch (error) {
    dispatch({
      type: ADDRESS_ADD_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

/* ===================== DELETE ADDRESS ===================== */
export const deleteAddress = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: ADDRESS_DELETE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.delete(
      `/api/users/addresses/${id}`,
      config
    )

    dispatch({
      type: ADDRESS_DELETE_SUCCESS,
      payload: data, // addresses[]
    })
  } catch (error) {
    dispatch({
      type: ADDRESS_DELETE_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

/* ===================== SET DEFAULT ADDRESS ===================== */
export const setDefaultAddress = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: ADDRESS_SET_DEFAULT_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(
      `/api/users/addresses/${id}/default`,
      {},
      config
    )

    dispatch({
      type: ADDRESS_SET_DEFAULT_SUCCESS,
      payload: data, // addresses[]
    })
  } catch (error) {
    dispatch({
      type: ADDRESS_SET_DEFAULT_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}