import React, { useEffect, useState } from 'react'
import { Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Product from '../components/Product'
import Message from '../components/Message'
import Meta from '../components/Meta'
import { naturalLanguageSearch } from '../actions/productActions'
import { PRODUCT_NL_SEARCH_RESET } from '../constants/productConstants'

// ═══════════════════ B3: Trang kết quả tìm kiếm bằng ngôn ngữ tự nhiên ═══════════════════
// Nhận câu tìm kiếm qua query string ?q=..., gửi cho AI phân tích, hiển thị lại
// các tiêu chí AI đã hiểu (dạng chip) + danh sách sản phẩm khớp.

const useQueryParam = (location, key) => {
  const params = new URLSearchParams(location.search)
  return params.get(key) || ''
}

const SmartSearchScreen = ({ location, history }) => {
  const dispatch = useDispatch()
  const query = useQueryParam(location, 'q')

  const [page, setPage] = useState(1)

  const productNLSearch = useSelector((state) => state.productNLSearch)
  const { loading, error, products = [], understood = [], pages, totalCount } = productNLSearch

  useEffect(() => {
    setPage(1)
    if (query.trim()) {
      dispatch(naturalLanguageSearch(query, 1))
    }
    return () => dispatch({ type: PRODUCT_NL_SEARCH_RESET })
  }, [dispatch, query])

  useEffect(() => {
    if (page > 1) dispatch(naturalLanguageSearch(query, page))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <>
      <Meta title={`Kết quả tìm kiếm AI: "${query}"`} />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '6px' }}>
          <i className='fas fa-robot me-2' style={{ color: '#33FFCC' }}></i>
          Tìm kiếm bằng AI
        </div>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.4rem' }}>
          "{query}"
        </h2>
      </div>

      {loading && (
        <div style={{ color: '#b8bcc8', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className='fas fa-spinner fa-spin' style={{ color: '#33FFCC' }}></i>
          AI đang phân tích câu tìm kiếm của bạn...
        </div>
      )}

      {error && (
        <Message variant='danger'>
          {error}
          {' '}
          <span
            onClick={() => history.push(`/?keyword=${encodeURIComponent(query)}`)}
            style={{ textDecoration: 'underline', cursor: 'pointer', color: '#33FFCC' }}
          >
            Dùng tìm kiếm thường thay thế
          </span>
        </Message>
      )}

      {!loading && !error && understood.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#8a8fa3', fontSize: '12.5px', marginBottom: '8px' }}>AI đã hiểu yêu cầu của bạn:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {understood.map((u, idx) => (
              <span key={idx} style={{
                background: 'rgba(51,255,204,0.08)', border: '1px solid rgba(51,255,204,0.35)',
                color: '#33FFCC', borderRadius: '16px', padding: '5px 14px', fontSize: '12.5px', fontWeight: '600',
              }}>
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ color: '#b8bcc8', fontSize: '13px', marginBottom: '14px' }}>
            Tìm thấy <strong style={{ color: '#ffffff' }}>{totalCount || 0}</strong> sản phẩm phù hợp
          </div>

          {products.length === 0 ? (
            <Message>
              Không tìm thấy sản phẩm nào khớp với yêu cầu này. Bạn có thể thử diễn đạt khác, hoặc{' '}
              <span
                onClick={() => history.push(`/?keyword=${encodeURIComponent(query)}`)}
                style={{ textDecoration: 'underline', cursor: 'pointer', color: '#33FFCC' }}
              >
                dùng tìm kiếm thường
              </span>.
            </Message>
          ) : (
            <>
              <Row>
                {products.map((product) => (
                  <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                    <Product product={product} />
                  </Col>
                ))}
              </Row>

              {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                  {[...Array(pages).keys()].map((x) => (
                    <button
                      key={x + 1}
                      onClick={() => setPage(x + 1)}
                      style={{
                        background: page === x + 1 ? '#33FFCC' : 'transparent',
                        color: page === x + 1 ? '#0f0f23' : '#b8bcc8',
                        border: '1px solid rgba(51,255,204,0.35)',
                        borderRadius: '8px', padding: '6px 14px', fontSize: '13px',
                        fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      {x + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

export default SmartSearchScreen