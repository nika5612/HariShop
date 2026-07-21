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
import SortableHeader from '../components/SortableHeader'
import { useTableSort, sortConfigToQuery } from '../utils/sortHelper'


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

  // MỚI: sort theo cột kiểu FC Online (click header) — thay cho dropdown
  const { sortConfig, handleSort } = useTableSort()

  useEffect(() => {
    dispatch({ type: PRODUCT_CREATE_RESET })

    if (!userInfo || !userInfo.isAdmin) {
      history.push('/login')
    }

    dispatch(listProducts(sortConfigToQuery(sortConfig), pageNumber))
  }, [
    dispatch,
    history,
    userInfo,
    successDelete,
    pageNumber,
    sortConfig,
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
                <SortableHeader label='Tên' sortKey='name' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Giá' sortKey='price' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Danh Mục' sortKey='category' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Hãng' sortKey='brand' sortConfig={sortConfig} onSort={handleSort} />
                <th>Màu sắc</th>
                <SortableHeader label='Tồn kho' sortKey='countInStock' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Đánh giá' sortKey='rating' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Ngày tạo' sortKey='createdAt' sortConfig={sortConfig} onSort={handleSort} />
                <th></th>


              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td title={product._id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                      )}
                      <span
                        title={product.name}
                        style={{
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td>{product.price.toLocaleString('vi-VN')}đ</td>
                  <td>{product.category}</td>
                  <td>{product.brand}</td>
                  <td>
                    {Array.isArray(product.colors) && product.colors.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {product.colors.map((c) => (
                          <span
                            key={c.name}
                            title={c.name}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: c.hexCode || '#888888',
                              border: '1px solid rgba(0,0,0,0.2)',
                              display: 'inline-block',
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>

                  <td>{Number.isFinite(product.countInStock) ? product.countInStock : 0}</td>
                  <td>{Number(product.rating || 0).toFixed(1)} ★</td>
                  <td>
                    {product.createdAt
                      ? new Date(product.createdAt).toLocaleDateString('vi-VN')
                      : '—'}
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