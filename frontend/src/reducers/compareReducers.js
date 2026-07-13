import { COMPARE_ADD_ITEM, COMPARE_REMOVE_ITEM, COMPARE_CLEAR, COMPARE_MAX_ITEMS } from '../constants/compareConstants'

export const compareReducer = (state = { compareItems: [] }, action) => {
  switch (action.type) {
    case COMPARE_ADD_ITEM: {
      const item = action.payload
      const exists = state.compareItems.find((x) => x._id === item._id)
      if (exists) return state
      if (state.compareItems.length >= COMPARE_MAX_ITEMS) return state
      return { ...state, compareItems: [...state.compareItems, item] }
    }
    case COMPARE_REMOVE_ITEM:
      return { ...state, compareItems: state.compareItems.filter((x) => x._id !== action.payload) }
    case COMPARE_CLEAR:
      return { ...state, compareItems: [] }
    default:
      return state
  }
}