import React, { useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Product from './Product'
import { getPersonalizedProducts } from '../actions/productActions'

// ═══════════════════ B4: Gợi ý cá nhân hoá (trang chủ) ═══════════════════
// Chỉ hiện cho khách ĐÃ ĐĂNG NHẬP và ĐÃ CÓ lịch sử đơn hàng — dựa trên brand/category
// khách mua nhiều nhất trong quá khứ. Ẩn hoàn toàn nếu chưa đủ dữ liệu (khách mới).

const PersonalizedSection = () => {
  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const productPersonalized = useSelector((state) => state.productPersonalized)
  const { products = [] } = productPersonalized

  useEffect(() => {
    if (userInfo) dispatch(getPersonalizedProducts())
  }, [dispatch, userInfo])

  if (!userInfo || !products || products.length === 0) return null

  return (
    <div style={{ marginBottom: '32px' }}>
      <h4 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '16px' }}>
        <i className='fas fa-magic me-2'></i>Gợi ý dành cho bạn
      </h4>
      <Row>
        {products.map((p) => (
          <Col key={p._id} xs={6} sm={4} md={3} lg={3} xl={2}>
            <Product product={p} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default PersonalizedSection