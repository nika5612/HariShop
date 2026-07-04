import React, { useEffect, useState } from 'react'

import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import {
  listProducts,
  deleteProduct,
} from '../actions/productActions'
import { PRODUCT_CREATE_RESET } from '../constants/productConstants'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'


const ProductListScreen = ({ history, match }) => {
  const pageNumber = match.params.pageNumber || 1

  const dispatch = useDispatch()

  const productList = useSelector((state) => state.productList)
  const { loading, error, products, page, pages } = productList

  const productDelete = useSelector((state) => state.productDelete)
  const {
    loading: loadingDelete,
    error: errorDelete,
    success: successDelete,
  } = productDelete

  const productCreate = useSelector((state) => state.productCreate)
  const {
    loading: loadingCreate,
    error: errorCreate,
  } = productCreate

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    dispatch({ type: PRODUCT_CREATE_RESET })

    if (!userInfo || !userInfo.isAdmin) {
      history.push('/login')
    }

    dispatch(listProducts('', pageNumber))
  }, [
    dispatch,
    history,
    userInfo,
    successDelete,
    pageNumber,
  ])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const deleteHandler = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }


  const createProductHandler = () => {
    history.push('/admin/product/new')
  }

  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá sản phẩm này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          dispatch(deleteProduct(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />

      <h1 className='text-center'>Sản Phẩm</h1>
      <Row className='justify-content-end mb-3'>
        <Col xs='auto'>
          <Button onClick={createProductHandler}>
            <i className='fas fa-plus'></i> Tạo Sản Phẩm
          </Button>
        </Col>
      </Row>
      {loadingDelete && <Loader />}
      {errorDelete && <Message variant='danger'>{errorDelete}</Message>}
      {loadingCreate && <Loader />}
      {errorCreate && <Message variant='danger'>{errorCreate}</Message>}
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          <Table striped bordered hover responsive className='table-sm'>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Giá</th>
                <th>Trọng lượng</th>
                <th>Danh Mục</th>
                <th>Hãng</th>
                <th>Màu sắc</th>
                <th></th>


              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product._id}</td>
                  <td>{product.name}</td>
                  <td>{product.price.toLocaleString('vi-VN')}đ</td>
                  <td>{product.weight ? `${product.weight}g` : 'N/A'}</td>
                  <td>{product.category}</td>
                  <td>{product.brand}</td>
                  <td>
                    {Array.isArray(product.colors) && product.colors.length > 0
                      ? product.colors.map((c) => c.name).join(', ')
                      : 'N/A'}
                  </td>

                  <td>

                    <LinkContainer to={`/admin/product/${product._id}/edit`}>
                      <Button variant='light' className='btn-sm'>
                        <i className='fas fa-edit'></i>
                      </Button>
                    </LinkContainer>
                    <Button
                      variant='danger'
                      className='btn-sm'
                      onClick={() => deleteHandler(product._id)}
                    >
                      <i className='fas fa-trash'></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginate pages={pages} page={page} isAdmin={true} />
        </>
      )}
    </>
  )
}

export default ProductListScreen
