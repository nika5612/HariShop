import {
  NOTIFICATION_LIST_REQUEST,
  NOTIFICATION_LIST_SUCCESS,
  NOTIFICATION_LIST_FAIL,
  NOTIFICATION_UNREAD_COUNT_SUCCESS,
  NOTIFICATION_MARK_READ_SUCCESS,
  NOTIFICATION_MARK_ALL_READ_SUCCESS,
  MY_NOTIFICATION_LIST_REQUEST,
  MY_NOTIFICATION_LIST_SUCCESS,
  MY_NOTIFICATION_LIST_FAIL,
  MY_NOTIFICATION_UNREAD_COUNT_SUCCESS,
  MY_NOTIFICATION_MARK_READ_SUCCESS,
  MY_NOTIFICATION_MARK_ALL_READ_SUCCESS,
} from '../constants/notificationConstants'

const initialState = { notifications: [], unreadCount: 0, loading: false, error: null }

export const notificationReducer = (state = initialState, action) => {
  switch (action.type) {
    case NOTIFICATION_LIST_REQUEST:
      return { ...state, loading: true }
    case NOTIFICATION_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount,
      }
    case NOTIFICATION_LIST_FAIL:
      return { ...state, loading: false, error: action.payload }
    case NOTIFICATION_UNREAD_COUNT_SUCCESS:
      return { ...state, unreadCount: action.payload }
    case NOTIFICATION_MARK_READ_SUCCESS:
      return {
        ...state,
        unreadCount: action.payload.unreadCount,
        notifications: state.notifications.map((n) =>
          n._id === action.payload.id ? { ...n, isRead: true } : n
        ),
      }
    case NOTIFICATION_MARK_ALL_READ_SUCCESS:
      return {
        ...state,
        unreadCount: 0,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }
    default:
      return state
  }
}

// ── MỚI: Reducer riêng cho thông báo của Khách hàng ─────────────
export const myNotificationReducer = (state = initialState, action) => {
  switch (action.type) {
    case MY_NOTIFICATION_LIST_REQUEST:
      return { ...state, loading: true }
    case MY_NOTIFICATION_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount,
      }
    case MY_NOTIFICATION_LIST_FAIL:
      return { ...state, loading: false, error: action.payload }
    case MY_NOTIFICATION_UNREAD_COUNT_SUCCESS:
      return { ...state, unreadCount: action.payload }
    case MY_NOTIFICATION_MARK_READ_SUCCESS:
      return {
        ...state,
        unreadCount: action.payload.unreadCount,
        notifications: state.notifications.map((n) =>
          n._id === action.payload.id ? { ...n, isRead: true } : n
        ),
      }
    case MY_NOTIFICATION_MARK_ALL_READ_SUCCESS:
      return {
        ...state,
        unreadCount: 0,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }
    default:
      return state
  }
}