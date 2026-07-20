import React, { useEffect, useState } from 'react'

import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { listUsers, deleteUser } from '../actions/userActions'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import SortableHeader from '../components/SortableHeader'
import { useTableSort, sortConfigToQuery } from '../utils/sortHelper'


const UserListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const userList = useSelector((state) => state.userList)
  const { loading, error, users } = userList

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const userDelete = useSelector((state) => state.userDelete)
  const { success: successDelete } = userDelete

  // MỚI: sort theo cột kiểu FC Online (click header)
  const { sortConfig, handleSort } = useTableSort()

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listUsers(sortConfigToQuery(sortConfig)))
    } else {
      history.push('/login')
    }
  }, [dispatch, history, successDelete, userInfo, sortConfig])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const deleteHandler = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }


  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá tài khoản này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          dispatch(deleteUser(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />
      <h1>Users</h1>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>ID</th>
              <SortableHeader label='Tên' sortKey='name' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='EMAIL' sortKey='email' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='ADMIN' sortKey='isAdmin' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='Ngày tạo' sortKey='createdAt' sortConfig={sortConfig} onSort={handleSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user._id}</td>
                <td>{user.name}</td>
                <td>
                  <a
                    href={`mailto:${user.email}`}
                    style={{ color: 'var(--hs-text, #eef0f7)', textDecoration: 'underline' }}
                  >
                    {user.email}
                  </a>
                </td>
                <td>
                  {user.isAdmin ? (
                    <i className='fas fa-check' style={{ color: 'green' }}></i>
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                    : '—'}
                </td>
                <td>
                  <LinkContainer to={`/admin/user/${user._id}/edit`}>
                    <Button variant='light' className='btn-sm'>
                      <i className='fas fa-edit'></i>
                    </Button>
                  </LinkContainer>
                  <Button
                    variant='danger'
                    className='btn-sm'
                    onClick={() => deleteHandler(user._id)}
                  >
                    <i className='fas fa-trash'></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default UserListScreen