import React, { useEffect, useState } from 'react'

import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { listOrders } from '../actions/orderActions'
import { getAdminRevenueSummary, getAdminBrandBreakdown, deleteOrderByAdmin } from '../actions/orderAdminActions'
import PieChart from '../components/PieChart'
import { ORDER_ADMIN_DELETE_RESET } from '../constants/orderConstants'
import { getOrderStatusInfo } from '../constants/orderStatusConfig'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import SortableHeader from '../components/SortableHeader'
import { useTableSort, sortConfigToQuery } from '../utils/sortHelper'


const OrderListScreen = ({ history }) => {

  const dispatch = useDispatch()

  const orderList = useSelector((state) => state.orderList)
  const { loading, error, orders } = orderList

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  // MỚI: sort theo cột kiểu FC Online (click header)
  const { sortConfig, handleSort } = useTableSort()

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listOrders(sortConfigToQuery(sortConfig)))
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo, sortConfig])

  const orderAdminRevenue = useSelector((state) => state.orderAdminRevenue)
  const { data: revenueData } = orderAdminRevenue

  const orderAdminBrand = useSelector((state) => state.orderAdminBrand)
  const { data: brandData } = orderAdminBrand

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(getAdminRevenueSummary(1))
      dispatch(getAdminBrandBreakdown(1))
    }
  }, [dispatch, userInfo])

  const orderAdminDelete = useSelector((state) => state.orderAdminDelete)
  const { loading: loadingDelete, error: errorDelete, success: successDelete } = orderAdminDelete

  useEffect(() => {
    if (successDelete) {
      dispatch({ type: ORDER_ADMIN_DELETE_RESET })
      dispatch(listOrders())
    }
  }, [dispatch, successDelete])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const deleteHandler = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }


  const formatDate = (value) => {
    if (!value) return null
    const s = typeof value === 'string' ? value : new Date(value).toISOString()
    return s?.length >= 10 ? s.substring(0, 10) : null
  }

  const renderOrderStatus = (order) => {
    const statusInfo = getOrderStatusInfo(order)
    return (
      <span style={{ color: statusInfo.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
        <i className={`${statusInfo.icon} me-1`} />{statusInfo.label}
      </span>
    )
  }

  // ── MỚI (A5): trạng thái thanh toán chi tiết — thay cho hiển thị ngày ──
  const renderPaymentStatus = (order) => {
    let mainBadge
    if (order?.refundStatus === 'completed') {
      mainBadge = (
        <span style={{ color: '#4cdb80', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <i className='fas fa-undo me-1' />Đã hoàn tiền
        </span>
      )
    } else if (order?.refundStatus === 'requested') {
      mainBadge = (
        <span style={{ color: '#ffd166', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <i className='fas fa-hand-holding-usd me-1' />Yêu cầu hoàn tiền
        </span>
      )
    } else if (order?.refundStatus === 'rejected') {
      mainBadge = (
        <span style={{ color: '#ff6b6b', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <i className='fas fa-times-circle me-1' />Từ chối hoàn tiền
        </span>
      )
    } else if (order?.isPaid) {
      mainBadge = (
        <span style={{ color: '#33FFCC', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <i className='fas fa-check-circle me-1' />Đã thanh toán
        </span>
      )
    } else {
      mainBadge = (
        <span style={{ color: '#8a8fa3', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <i className='fas fa-times me-1' />Chưa thanh toán
        </span>
      )
    }

    // MỚI: badge phụ — đơn có thể VỪA "đã thanh toán" VỪA "cần hoàn tiền
    // thừa" cùng lúc (2 trạng thái không loại trừ nhau), nên hiện thêm bên
    // dưới thay vì thay thế mainBadge, giúp Admin thấy ngay trong danh sách
    // mà không cần mở từng đơn hoặc phụ thuộc vào thông báo chuông.
    const overpaidBadge = order?.overpaidRefundStatus === 'pending' && (
      <div style={{ marginTop: 4 }}>
        <span
          title={`Khách chuyển thừa ${(order.overpaidAmount || 0).toLocaleString('vi-VN')}đ`}
          style={{
            color: '#0f0f23', background: '#ffd166', fontWeight: 700, fontSize: 11,
            whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 10, display: 'inline-flex',
            alignItems: 'center', gap: 4,
          }}
        >
          <i className='fas fa-coins' />
          Cần hoàn {(order.overpaidAmount || 0).toLocaleString('vi-VN')}đ
        </span>
      </div>
    )

    return (
      <>
        {mainBadge}
        {overpaidBadge}
      </>
    )
  }

  const revenueSafe = revenueData || null
  const brandSafe = brandData || null

  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá đơn hàng này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          dispatch(deleteOrderByAdmin(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />
      <h1>Danh sách đơn hàng</h1>

      {revenueSafe && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '8px 0' }}>Tổng doanh thu (1 tháng, đơn đã giao thành công)</h3>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {Number(revenueSafe.totalRevenue || 0).toLocaleString('vi-VN')}đ
          </div>
        </div>
      )}

      {brandSafe && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '8px 0' }}>Tỷ trọng doanh thu theo hãng (đơn đã giao thành công)</h3>
          <PieChart
            labels={Array.isArray(brandSafe.labels) ? brandSafe.labels : []}
            percentages={Array.isArray(brandSafe.percentages) ? brandSafe.percentages : []}
            values={Array.isArray(brandSafe.values) ? brandSafe.values : []}
          />
        </div>
      )}

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          {loadingDelete ? <Loader /> : null}
          {errorDelete ? <Message variant='danger'>{errorDelete}</Message> : null}
          {successDelete ? <Message variant='success'>Đã xoá đơn.</Message> : null}

          <Table striped bordered hover responsive className='table-sm'>
            <thead>
              <tr>
                <SortableHeader label='ID' sortKey='orderId' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='USER' sortKey='customerName' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Ngày' sortKey='createdAt' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Tổng' sortKey='totalPrice' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Trạng thái' sortKey='deliveryStatus' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Thanh Toán' sortKey='paymentStatus' sortConfig={sortConfig} onSort={handleSort} />
                <th>Đã Giao Hàng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((order) => (
                <tr key={order._id}>
                  <td>{order?._id}</td>
                  <td>{order?.user?.name || '—'}</td>
                  <td>{formatDate(order?.createdAt) || '—'}</td>
                  <td>{(order?.totalPrice || 0).toLocaleString('vi-VN')}đ</td>
                  <td>{renderOrderStatus(order)}</td>
                  <td>{renderPaymentStatus(order)}</td>
                  <td>
                    {order?.isDelivered ? (
                      formatDate(order?.deliveredAt) || '—'
                    ) : (
                      <i className='fas fa-times' style={{ color: 'red' }} />
                    )}
                  </td>

                  <td>
                    <LinkContainer to={`/order/${order._id}`}>
                      <Button variant='light' className='btn-sm mr-2'>
                        Chi tiết
                      </Button>
                    </LinkContainer>

                    {userInfo?.isAdmin && (
                      <Button
                        variant='danger'
                        className='btn-sm'
                        onClick={() => deleteHandler(order._id)}
                        disabled={orderAdminDelete?.loading}
                      >
                        <i className='fas fa-trash' />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  )
}

export default OrderListScreen