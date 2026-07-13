import React, { useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Product from './Product'
import { getRelatedProducts } from '../actions/productActions'

// ═══════════════════ B4: Gợi ý sản phẩm thông minh (trang chi tiết sản phẩm) ═══════════════════
// Hiện 2 khối: "Sản phẩm tương tự" (cùng brand/category, giá gần nhau) và
// "Khách hàng thường mua cùng" (phân tích lịch sử đơn hàng thật trong DB).

const ProductRow = ({ title, icon, products }) => {
  if (!products || products.length === 0) return null
  return (
    <div style={{ marginTop: '32px' }}>
      <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
        <i className={`${icon} me-2`}></i>{title}
      </h5>
      <Row>
        {products.map((p) => (
          <Col key={p._id} xs={6} sm={4} md={3} lg={3}>
            <Product product={p} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

const RelatedProducts = ({ productId }) => {
  const dispatch = useDispatch()
  const productRelated = useSelector((state) => state.productRelated)
  const { similar, frequentlyBoughtTogether } = productRelated

  useEffect(() => {
    if (productId) dispatch(getRelatedProducts(productId))
  }, [dispatch, productId])

  if ((!similar || similar.length === 0) && (!frequentlyBoughtTogether || frequentlyBoughtTogether.length === 0)) {
    return null
  }

  return (
    <div>
      <ProductRow
        title='Khách hàng thường mua cùng'
        icon='fas fa-people-carry'
        products={frequentlyBoughtTogether}
      />
      <ProductRow
        title='Sản phẩm tương tự'
        icon='fas fa-th-large'
        products={similar}
      />
    </div>
  )
}

export default RelatedProducts