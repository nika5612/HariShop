import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Breadcrumb, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Product from '../components/Product'
import Loader from '../components/Loader'
import Message from '../components/Message'
import Paginate from '../components/Paginate'
import Meta from '../components/Meta'
import { listProducts } from '../actions/productActions'

const FilteredProductsScreen = ({ match, location }) => {
  const value = match.params.value
  const pageNumber = match.params.pageNumber || 1

  // 🔹 SORT STATE
  const [sort, setSort] = useState('latest')

  const dispatch = useDispatch()

  const productList = useSelector((state) => state.productList)
  const { loading, error, products, page, pages } = productList

  // 🔹 XÁC ĐỊNH LOẠI FILTER
  const isBrand = location.pathname.startsWith('/brand')
  const isPrice = location.pathname.startsWith('/price')

  let brand = ''
  let minPrice = ''
  let maxPrice = ''

  if (isBrand) {
    brand = value
  }

  if (isPrice) {
    if (value === 'duoi-10tr') {
      minPrice = 0
      maxPrice = 10000000
    } else if (value === '10-20tr') {
      minPrice = 10000000
      maxPrice = 20000000
    } else if (value === 'tren-20tr') {
      minPrice = 20000000
    }
  }

  // 🔹 FETCH PRODUCTS (FILTER + SORT + PAGINATION)
  useEffect(() => {
    dispatch(
      listProducts(
        { brand, minPrice, maxPrice, sort },
        pageNumber
      )
    )
  }, [dispatch, brand, minPrice, maxPrice, sort, pageNumber])

  const getTitle = () => {
    if (isBrand) return `Hãng: ${value}`
    if (isPrice) {
      if (value === 'duoi-10tr') return 'Giá dưới 10 triệu'
      if (value === '10-20tr') return 'Giá từ 10 – 20 triệu'
      if (value === 'tren-20tr') return 'Giá trên 20 triệu'
    }
    return 'Sản phẩm'
  }

  return (
    <>
      <Meta title={getTitle()} />

      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{getTitle()}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className='align-items-center mb-3'>
        <Col md={9}>
          <h2>{getTitle()}</h2>
        </Col>
        <Col md={3}>
          <Form.Control
            as="select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >

          >
            <option value='latest'>Mới nhất</option>
            <option value='priceAsc'>Giá tăng dần</option>
            <option value='priceDesc'>Giá giảm dần</option>
          </Form.Control>
        </Col>
      </Row>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : products.length === 0 ? (
        <Message>Không có sản phẩm phù hợp</Message>
      ) : (
        <>
          <Row>
            {products.map((product) => (
              <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                <Product product={product} />
              </Col>
            ))}
          </Row>

          <Paginate
            pages={pages}
            page={page}
            keyword={`${isBrand ? 'brand' : 'price'}/${value}`}
          />
        </>
      )}
    </>
  )
}

export default FilteredProductsScreen
