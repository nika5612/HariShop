import React, { useEffect, useMemo, useState } from 'react'
import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'

import Message from '../components/Message'
import Loader from '../components/Loader'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

import { listVouchers, deleteVoucher } from '../actions/voucherAdminActions'
import { VOUCHER_DELETE_RESET } from '../constants/voucherConstants'

const formatDate = (value) => {
  if (!value) return null
  const s = typeof value === 'string' ? value : new Date(value).toISOString()
  return s?.length >= 10 ? s.substring(0, 10) : null
}

const VoucherListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const voucherList = useSelector((state) => state.voucherList)
  const { loading, error, vouchers } = voucherList

  const voucherDelete = useSelector((state) => state.voucherDelete)
  const { loading: loadingDelete, error: errorDelete, success: successDelete } = voucherDelete

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listVouchers())
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo])

  useEffect(() => {
    if (successDelete) {
      dispatch({ type: VOUCHER_DELETE_RESET })
      dispatch(listVouchers())
    }
  }, [dispatch, successDelete])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const remainingLabel = useMemo(() => {
    return (usageLimit, usedCount) => {
      const ul = Number(usageLimit || 0)
      const uc = Number(usedCount || 0)
      if (ul === 0) return 'Không giới hạn'
      const left = ul - uc
      return left <= 0 ? '0' : String(left)
    }
  }, [])

  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá voucher này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          if (deleteId) dispatch(deleteVoucher(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />

      <h1>Danh sách voucher</h1>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          {loadingDelete ? <Loader /> : null}
          {errorDelete ? <Message variant='danger'>{errorDelete}</Message> : null}
          {successDelete ? <Message variant='success'>Đã xoá voucher.</Message> : null}

          <Table striped bordered hover responsive className='table-sm'>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Đơn tối thiểu</th>
                <th>Max giảm</th>
                <th>Giới hạn lượt</th>
                <th>Đã dùng</th>
                <th>Còn lại</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(vouchers || []).map((v) => {
                const usageLimit = Number(v?.usageLimit || 0)
                const usedCount = Number(v?.usedCount || 0)
                return (
                  <tr key={v?._id || v?.id}>
                    <td>{v?.code}</td>
                    <td>{v?.type === 'percent' ? '%' : 'VNĐ'}</td>
                    <td>{Number(v?.value || 0).toLocaleString('vi-VN')}</td>
                    <td>{Number(v?.minOrder || 0).toLocaleString('vi-VN')}đ</td>
                    <td>{Number(v?.maxDiscount || 0).toLocaleString('vi-VN')}đ</td>
                    <td>{usageLimit === 0 ? 'Không giới hạn' : usageLimit}</td>
                    <td>{usedCount}</td>
                    <td>{remainingLabel(usageLimit, usedCount)}</td>
                    <td>
                      {formatDate(v?.startsAt)} → {formatDate(v?.expiresAt)}
                    </td>
                    <td>
                      {v?.isActive ? (
                        <span style={{ color: '#4cdb80', fontWeight: 700 }}>Đang hoạt động</span>
                      ) : (
                        <span style={{ color: '#ff6b6b', fontWeight: 700 }}>Tạm dừng</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <LinkContainer to={`/admin/voucher/${v?._id}/edit`}>
                          <Button variant='light' size='sm'>
                            <i className='fas fa-edit' />
                          </Button>
                        </LinkContainer>
                        {userInfo?.isAdmin && (
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={() => {
                              setDeleteId(v?._id)
                              setShowConfirm(true)
                            }}
                            disabled={voucherDelete?.loading}
                          >
                            <i className='fas fa-trash' />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </>
      )}
    </>
  )
}

export default VoucherListScreen

