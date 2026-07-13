import {
  PRODUCT_LIST_REQUEST,
  PRODUCT_LIST_SUCCESS,
  PRODUCT_LIST_FAIL,
  PRODUCT_DETAILS_REQUEST,
  PRODUCT_DETAILS_SUCCESS,
  PRODUCT_DETAILS_FAIL,
  PRODUCT_DELETE_REQUEST,
  PRODUCT_DELETE_SUCCESS,
  PRODUCT_DELETE_FAIL,
  PRODUCT_CREATE_RESET,
  PRODUCT_CREATE_FAIL,
  PRODUCT_CREATE_SUCCESS,
  PRODUCT_CREATE_REQUEST,
  PRODUCT_UPDATE_REQUEST,
  PRODUCT_UPDATE_SUCCESS,
  PRODUCT_UPDATE_FAIL,
  PRODUCT_UPDATE_RESET,
  PRODUCT_CREATE_REVIEW_REQUEST,
  PRODUCT_CREATE_REVIEW_SUCCESS,
  PRODUCT_CREATE_REVIEW_FAIL,
  PRODUCT_CREATE_REVIEW_RESET,
  PRODUCT_TOP_REQUEST,
  PRODUCT_TOP_SUCCESS,
  PRODUCT_TOP_FAIL,
  PRODUCT_NL_SEARCH_REQUEST,
  PRODUCT_NL_SEARCH_SUCCESS,
  PRODUCT_NL_SEARCH_FAIL,
  PRODUCT_NL_SEARCH_RESET,
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

export const productListReducer = (state = { products: [] }, action) => {
  switch (action.type) {
    case PRODUCT_LIST_REQUEST:
      return { loading: true, products: [] }
    case PRODUCT_LIST_SUCCESS:
      return {
        loading: false,
        products: action.payload.products,
        pages: action.payload.pages,
        page: action.payload.page,
      }
    case PRODUCT_LIST_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const productDetailsReducer = (
  state = { product: { reviews: [] } },
  action
) => {
  switch (action.type) {
    case PRODUCT_DETAILS_REQUEST:
      return { ...state, loading: true }
    case PRODUCT_DETAILS_SUCCESS:
      return { loading: false, product: action.payload }
    case PRODUCT_DETAILS_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const productDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_DELETE_REQUEST:
      return { loading: true }
    case PRODUCT_DELETE_SUCCESS:
      return { loading: false, success: true }
    case PRODUCT_DELETE_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const productCreateReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_CREATE_REQUEST:
      return { loading: true }
    case PRODUCT_CREATE_SUCCESS:
      return { loading: false, success: true, product: action.payload }
    case PRODUCT_CREATE_FAIL:
      return { loading: false, error: action.payload }
    case PRODUCT_CREATE_RESET:
      return {}
    default:
      return state
  }
}

export const productUpdateReducer = (state = { product: {} }, action) => {
  switch (action.type) {
    case PRODUCT_UPDATE_REQUEST:
      return { loading: true }
    case PRODUCT_UPDATE_SUCCESS:
      return { loading: false, success: true, product: action.payload }
    case PRODUCT_UPDATE_FAIL:
      return { loading: false, error: action.payload }
    case PRODUCT_UPDATE_RESET:
      return { product: {} }
    default:
      return state
  }
}

export const productReviewCreateReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_CREATE_REVIEW_REQUEST:
      return { loading: true }
    case PRODUCT_CREATE_REVIEW_SUCCESS:
      return { loading: false, success: true }
    case PRODUCT_CREATE_REVIEW_FAIL:
      return { loading: false, error: action.payload }
    case PRODUCT_CREATE_REVIEW_RESET:
      return {}
    default:
      return state
  }
}

export const productTopRatedReducer = (state = { products: [] }, action) => {
  switch (action.type) {
    case PRODUCT_TOP_REQUEST:
      return { loading: true, products: [] }
    case PRODUCT_TOP_SUCCESS:
      return { loading: false, products: action.payload }
    case PRODUCT_TOP_FAIL:
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

export const productDeleteReviewReducer = (state = {}, action) => {
  switch (action.type) {
    case 'PRODUCT_DELETE_REVIEW_REQUEST':
      return { loading: true }
    case 'PRODUCT_DELETE_REVIEW_SUCCESS':
      return { loading: false, success: true }
    case 'PRODUCT_DELETE_REVIEW_FAIL':
      return { loading: false, error: action.payload }
    default:
      return state
  }
}

// ===== B3: Tìm kiếm bằng ngôn ngữ tự nhiên =====
export const productNLSearchReducer = (state = { products: [], understood: [] }, action) => {
  switch (action.type) {
    case PRODUCT_NL_SEARCH_REQUEST:
      return { loading: true, products: [], understood: [] }
    case PRODUCT_NL_SEARCH_SUCCESS:
      return {
        loading: false,
        products: action.payload.products,
        understood: action.payload.understood,
        filters: action.payload.filters,
        query: action.payload.query,
        page: action.payload.page,
        pages: action.payload.pages,
        totalCount: action.payload.totalCount,
      }
    case PRODUCT_NL_SEARCH_FAIL:
      return { loading: false, error: action.payload, products: [], understood: [] }
    case PRODUCT_NL_SEARCH_RESET:
      return { products: [], understood: [] }
    default:
      return state
  }
}

// ===== B4: Gợi ý sản phẩm thông minh =====
export const productRelatedReducer = (state = { similar: [], frequentlyBoughtTogether: [] }, action) => {
  switch (action.type) {
    case PRODUCT_RELATED_REQUEST:
      return { loading: true, similar: [], frequentlyBoughtTogether: [] }
    case PRODUCT_RELATED_SUCCESS:
      return { loading: false, similar: action.payload.similar, frequentlyBoughtTogether: action.payload.frequentlyBoughtTogether }
    case PRODUCT_RELATED_FAIL:
      return { loading: false, error: action.payload, similar: [], frequentlyBoughtTogether: [] }
    default:
      return state
  }
}

export const productPersonalizedReducer = (state = { products: [] }, action) => {
  switch (action.type) {
    case PRODUCT_PERSONALIZED_REQUEST:
      return { loading: true, products: [] }
    case PRODUCT_PERSONALIZED_SUCCESS:
      return { loading: false, products: action.payload.products }
    case PRODUCT_PERSONALIZED_FAIL:
      return { loading: false, error: action.payload, products: [] }
    default:
      return state
  }
}

// ===== B5: Tóm tắt & phân tích đánh giá bằng AI =====
export const productReviewSummaryReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_REVIEW_SUMMARY_REQUEST:
      return { loading: true }
    case PRODUCT_REVIEW_SUMMARY_SUCCESS:
      return { loading: false, ...action.payload }
    case PRODUCT_REVIEW_SUMMARY_FAIL:
      return { loading: false, error: action.payload, available: false }
    default:
      return state
  }
}