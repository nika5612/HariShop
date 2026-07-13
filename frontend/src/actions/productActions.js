import axios from 'axios'
import {
  PRODUCT_LIST_REQUEST,
  PRODUCT_LIST_SUCCESS,
  PRODUCT_LIST_FAIL,
  PRODUCT_DETAILS_REQUEST,
  PRODUCT_DETAILS_SUCCESS,
  PRODUCT_DETAILS_FAIL,
  PRODUCT_DELETE_SUCCESS,
  PRODUCT_DELETE_REQUEST,
  PRODUCT_DELETE_FAIL,
  PRODUCT_CREATE_REQUEST,
  PRODUCT_CREATE_SUCCESS,
  PRODUCT_CREATE_FAIL,
  PRODUCT_UPDATE_REQUEST,
  PRODUCT_UPDATE_SUCCESS,
  PRODUCT_UPDATE_FAIL,
  PRODUCT_CREATE_REVIEW_REQUEST,
  PRODUCT_CREATE_REVIEW_SUCCESS,
  PRODUCT_CREATE_REVIEW_FAIL,
  PRODUCT_TOP_REQUEST,
  PRODUCT_TOP_SUCCESS,
  PRODUCT_TOP_FAIL,
  PRODUCT_DELETE_REVIEW_REQUEST,
  PRODUCT_DELETE_REVIEW_SUCCESS,
  PRODUCT_DELETE_REVIEW_FAIL,
  PRODUCT_NL_SEARCH_REQUEST,
  PRODUCT_NL_SEARCH_SUCCESS,
  PRODUCT_NL_SEARCH_FAIL,
  PRODUCT_RELATED_REQUEST,
  PRODUCT_RELATED_SUCCESS,
  PRODUCT_RELATED_FAIL,
  PRODUCT_PERSONALIZED_REQUEST,
  PRODUCT_PERSONALIZED_SUCCESS,
  PRODUCT_PERSONALIZED_FAIL,
  PRODUCT_REVIEW_SUMMARY_REQUEST,
  PRODUCT_REVIEW_SUMMARY_SUCCESS,
  PRODUCT_REVIEW_SUMMARY_FAIL,
} from '../constants/productConstants'
import { logout } from './userActions'

const getSafeErrorMessage = (error) => {
  const data = error?.response?.data
  if (data && typeof data === 'object' && data.message) return data.message
  if (typeof data === 'string' && data.trim() && data.trim() !== 'undefined') return data
  return error?.message || 'Request failed'
}

/* =======================
   HOME / SEARCH / FILTER
======================= */
export const listProducts =
  (
    { keyword = '', brand = '', minPrice = '', maxPrice = '', sort = 'latest' },
    pageNumber = ''
  ) =>
  async (dispatch) => {
    try {
      dispatch({ type: PRODUCT_LIST_REQUEST })

      let query = `/api/products?keyword=${keyword}&pageNumber=${pageNumber}`

      if (brand) query += `&brand=${brand}`
      if (minPrice !== '') query += `&minPrice=${minPrice}`
      if (maxPrice !== '') query += `&maxPrice=${maxPrice}`
      if (sort) query += `&sort=${sort}`

      const { data } = await axios.get(query)
      
      // Safe JSON handling - ensure data is object
      if (data && typeof data === 'object') {
        dispatch({
          type: PRODUCT_LIST_SUCCESS,
          payload: data,
        })
      } else {
        dispatch({
          type: PRODUCT_LIST_FAIL,
          payload: 'Invalid API response format'
        })
      }
    } catch (error) {
      const errorMsg = getSafeErrorMessage(error)
      dispatch({
        type: PRODUCT_LIST_FAIL,
        payload: errorMsg,
      })
    }
  }


/* =======================
   PRODUCT DETAILS
======================= */
export const listProductDetails = (id) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_DETAILS_REQUEST })

    const { data } = await axios.get(`/api/products/${id}`)

    dispatch({
      type: PRODUCT_DETAILS_SUCCESS,
      payload: data,
    })
  } catch (error) {
    dispatch({
      type: PRODUCT_DETAILS_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    })
  }
}

/* =======================
   ADMIN ACTIONS
======================= */
export const deleteProduct = (id) => async (dispatch, getState) => {
  try {
    dispatch({ type: PRODUCT_DELETE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    await axios.delete(`/api/products/${id}`, config)

    dispatch({ type: PRODUCT_DELETE_SUCCESS })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: PRODUCT_DELETE_FAIL,
      payload: message,
    })
  }
}

export const createProduct = (product = {}) => async (dispatch, getState) => {
  try {
    dispatch({ type: PRODUCT_CREATE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.post(`/api/products`, product, config)

    dispatch({
      type: PRODUCT_CREATE_SUCCESS,
      payload: data,
    })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: PRODUCT_CREATE_FAIL,
      payload: message,
    })
  }
}

export const updateProduct = (product) => async (dispatch, getState) => {
  try {
    dispatch({ type: PRODUCT_UPDATE_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    const { data } = await axios.put(
      `/api/products/${product._id}`,
      product,
      config
    )

    dispatch({
      type: PRODUCT_UPDATE_SUCCESS,
      payload: data,
    })

    dispatch({
      type: PRODUCT_DETAILS_SUCCESS,
      payload: data,
    })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: PRODUCT_UPDATE_FAIL,
      payload: message,
    })
  }
}

export const createProductReview = (productId, review) => async (
  dispatch,
  getState
) => {
  try {
    dispatch({ type: PRODUCT_CREATE_REVIEW_REQUEST })

    const {
      userLogin: { userInfo },
    } = getState()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userInfo.token}`,
      },
    }

    await axios.post(`/api/products/${productId}/reviews`, review, config)

    dispatch({ type: PRODUCT_CREATE_REVIEW_SUCCESS })
  } catch (error) {
    const message =
      error.response && error.response.data.message
        ? error.response.data.message
        : error.message

    if (message === 'Not authorized, token failed') {
      dispatch(logout())
    }

    dispatch({
      type: PRODUCT_CREATE_REVIEW_FAIL,
      payload: message,
    })
  }
}

/* =======================
   TOP PRODUCTS
======================= */
export const listTopProducts = () => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_TOP_REQUEST })

    const { data } = await axios.get('/api/products/top')

    dispatch({
      type: PRODUCT_TOP_SUCCESS,
      payload: data,
    })
  } catch (error) {
    dispatch({
      type: PRODUCT_TOP_FAIL,
      payload:
        getSafeErrorMessage(error),
    })
  }
}

export const deleteProductReview = (productId, reviewId) => async (dispatch, getState) => {
  try {
    dispatch({ type: PRODUCT_DELETE_REVIEW_REQUEST })

    const { userLogin: { userInfo } } = getState()

    const config = {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    }

    await axios.delete(`/api/products/${productId}/reviews/${reviewId}`, config)

    dispatch({ type: PRODUCT_DELETE_REVIEW_SUCCESS })
  } catch (error) {
    const message = error.response && error.response.data.message ? error.response.data.message : error.message
    if (message === 'Not authorized, token failed') dispatch(logout())
    dispatch({ type: PRODUCT_DELETE_REVIEW_FAIL, payload: message })
  }
}

// ===== B3: Tìm kiếm bằng ngôn ngữ tự nhiên (AI phân tích câu tìm kiếm) =====
export const naturalLanguageSearch = (query, pageNumber = 1) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_NL_SEARCH_REQUEST })

    const config = { headers: { 'Content-Type': 'application/json' } }
    const { data } = await axios.post('/api/products/nl-search', { query, pageNumber }, config)

    dispatch({ type: PRODUCT_NL_SEARCH_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: PRODUCT_NL_SEARCH_FAIL, payload: getSafeErrorMessage(error) })
  }
}

// ===== B4: Gợi ý sản phẩm thông minh =====

// Sản phẩm tương tự + sản phẩm khách hàng thường mua cùng (trang chi tiết sản phẩm)
export const getRelatedProducts = (productId) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_RELATED_REQUEST })
    const { data } = await axios.get(`/api/products/${productId}/related`)
    dispatch({ type: PRODUCT_RELATED_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: PRODUCT_RELATED_FAIL, payload: getSafeErrorMessage(error) })
  }
}

// Gợi ý cá nhân hoá dựa trên lịch sử đơn hàng của khách đang đăng nhập
export const getPersonalizedProducts = () => async (dispatch, getState) => {
  try {
    dispatch({ type: PRODUCT_PERSONALIZED_REQUEST })

    const { userLogin: { userInfo } } = getState()
    if (!userInfo) {
      dispatch({ type: PRODUCT_PERSONALIZED_SUCCESS, payload: { products: [] } })
      return
    }

    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }
    const { data } = await axios.get('/api/products/personalized', config)

    dispatch({ type: PRODUCT_PERSONALIZED_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: PRODUCT_PERSONALIZED_FAIL, payload: getSafeErrorMessage(error) })
  }
}

// ===== B5: Tóm tắt & phân tích đánh giá bằng AI =====
export const getReviewSummary = (productId) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_REVIEW_SUMMARY_REQUEST })
    const { data } = await axios.get(`/api/products/${productId}/review-summary`)
    dispatch({ type: PRODUCT_REVIEW_SUMMARY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: PRODUCT_REVIEW_SUMMARY_FAIL, payload: getSafeErrorMessage(error) })
  }
}