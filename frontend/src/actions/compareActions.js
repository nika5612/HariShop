import { COMPARE_ADD_ITEM, COMPARE_REMOVE_ITEM, COMPARE_CLEAR } from '../constants/compareConstants'

export const addToCompare = (product) => (dispatch, getState) => {
  dispatch({
    type: COMPARE_ADD_ITEM,
    payload: {
      _id: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      brand: product.brand,
    },
  })
  localStorage.setItem('compareItems', JSON.stringify(getState().compare.compareItems))
}

export const removeFromCompare = (productId) => (dispatch, getState) => {
  dispatch({ type: COMPARE_REMOVE_ITEM, payload: productId })
  localStorage.setItem('compareItems', JSON.stringify(getState().compare.compareItems))
}

export const clearCompare = () => (dispatch) => {
  dispatch({ type: COMPARE_CLEAR })
  localStorage.removeItem('compareItems')
}