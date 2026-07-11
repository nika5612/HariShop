import axios from 'axios'
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

const getErrorMessage = (error) => {
  try {
    return error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message
  } catch (e) {
    return error.message || 'Đã xảy ra lỗi'
  }
}

export const listNotifications = (limit = 20) => async (dispatch, getState) => {
  try {
    dispatch({ type: NOTIFICATION_LIST_REQUEST })

    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    const { data } = await axios.get(`/api/notifications?limit=${limit}`, config)

    dispatch({ type: NOTIFICATION_LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: NOTIFICATION_LIST_FAIL, payload: getErrorMessage(error) })
  }
}

// Gọi định kỳ (poll) để cập nhật số badge chưa đọc mà không cần load lại toàn bộ danh sách
export const fetchUnreadCount = () => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    if (!userInfo?.isAdmin) return

    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }
    const { data } = await axios.get('/api/notifications/unread-count', config)

    dispatch({ type: NOTIFICATION_UNREAD_COUNT_SUCCESS, payload: data.unreadCount })
  } catch (error) {
    // Poll lỗi thì bỏ qua âm thầm, không làm phiền người dùng
  }
}

export const markNotificationRead = (id) => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    const { data } = await axios.put(`/api/notifications/${id}/read`, {}, config)

    dispatch({ type: NOTIFICATION_MARK_READ_SUCCESS, payload: { id, unreadCount: data.unreadCount } })
  } catch (error) {
    // im lặng bỏ qua
  }
}

export const markAllNotificationsRead = () => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    await axios.put('/api/notifications/read-all', {}, config)

    dispatch({ type: NOTIFICATION_MARK_ALL_READ_SUCCESS })
  } catch (error) {
    // im lặng bỏ qua
  }
}

/* ═══════════════════ THÔNG BÁO CHO KHÁCH HÀNG ═══════════════════ */

export const listMyNotifications = (limit = 20) => async (dispatch, getState) => {
  try {
    dispatch({ type: MY_NOTIFICATION_LIST_REQUEST })

    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    const { data } = await axios.get(`/api/notifications/my?limit=${limit}`, config)

    dispatch({ type: MY_NOTIFICATION_LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: MY_NOTIFICATION_LIST_FAIL, payload: getErrorMessage(error) })
  }
}

export const fetchMyUnreadCount = () => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    if (!userInfo || userInfo.isAdmin) return

    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }
    const { data } = await axios.get('/api/notifications/my/unread-count', config)

    dispatch({ type: MY_NOTIFICATION_UNREAD_COUNT_SUCCESS, payload: data.unreadCount })
  } catch (error) {
    // im lặng bỏ qua
  }
}

export const markMyNotificationRead = (id) => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    const { data } = await axios.put(`/api/notifications/${id}/read`, {}, config)

    dispatch({ type: MY_NOTIFICATION_MARK_READ_SUCCESS, payload: { id, unreadCount: data.unreadCount } })
  } catch (error) {
    // im lặng bỏ qua
  }
}

export const markAllMyNotificationsRead = () => async (dispatch, getState) => {
  try {
    const { userLogin: { userInfo } } = getState()
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }

    await axios.put('/api/notifications/my/read-all', {}, config)

    dispatch({ type: MY_NOTIFICATION_MARK_ALL_READ_SUCCESS })
  } catch (error) {
    // im lặng bỏ qua
  }
}