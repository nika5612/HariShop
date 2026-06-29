import React, { useState } from 'react'
import { Container, Row, Col, Modal } from 'react-bootstrap'

const Footer = () => {
  const [showZalo, setShowZalo] = useState(false)

  return (
    <>
      <footer className="py-5 fade-in-up" style={{ 
        background: 'var(--bg-card)', 
        borderTop: '1px solid rgba(51,255,204,0.2)',
        marginTop: '4rem'
      }}>
        <Container>
          <Row className="g-4">
            <Col md={4}>
              <h5 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                📱 Hari Shop
              </h5>
              <p className="text-secondary mb-0">
                Cửa hàng điện thoại uy tín nhất với giá tốt nhất. 
                Giao hàng nhanh toàn quốc!
              </p>
            </Col>
            <Col md={2}>
              <h6 className="mb-3" style={{ color: 'var(--text-primary)' }}>Sản phẩm</h6>
              <ul className="list-unstyled">
                <li><a href="/" className="text-secondary text-decoration-none">iPhone</a></li>
                <li><a href="/" className="text-secondary text-decoration-none">Samsung</a></li>
                <li><a href="/" className="text-secondary text-decoration-none">Xiaomi</a></li>
              </ul>
            </Col>
            <Col md={3}>
              <h6 className="mb-3" style={{ color: 'var(--text-primary)' }}>Hỗ trợ</h6>
              <ul className="list-unstyled">
                <li><a href="/profile" className="text-secondary text-decoration-none">Tài khoản</a></li>
                <li><a href="/" className="text-secondary text-decoration-none">Đặt hàng</a></li>
                <li><a href="/" className="text-secondary text-decoration-none">Liên hệ</a></li>
              </ul>
            </Col>
            <Col md={3}>
              <h6 className="mb-3" style={{ color: 'var(--text-primary)' }}>Liên Hệ & Theo Dõi</h6>
              <div className="d-flex gap-3 mb-3">
                <a href="https://www.facebook.com/hai.ne562162/" target="_blank" rel="noreferrer" className="btn-outline-custom p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} aria-label="Facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <button onClick={() => setShowZalo(true)} type="button" className="btn-outline-custom p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} aria-label="Zalo">
                  Zalo
                </button>
              </div>
              <p className="mb-1 text-secondary" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                <i className="fas fa-phone-alt me-2"></i>0339959893
              </p>
              <p className="mt-3 mb-0 small text-secondary">
                 <i className='fas fa-map-marker-alt me-2'></i>Địa chỉ: 56 ấp Nhà thờ, xã Tân Lân, Huyện Cần Đước, tỉnh Long An
              </p>
              <p className="mt-3 mb-0 small text-secondary">
                © 2026 Hari Shop. All rights reserved.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>

      {/* Zalo Modal */}
      <Modal show={showZalo} onHide={() => setShowZalo(false)} centered>
        <Modal.Header closeButton style={{ background: '#1a1a2e', color: '#ffffff', borderBottom: '1px solid #33FFCC' }}>
          <Modal.Title>Quét mã Zalo</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#1a1a2e', textAlign: 'center' }}>
          <img src="images/zalo.jpg" alt="Zalo QR Code" style={{ maxWidth: '100%', borderRadius: '10px' }} />
        </Modal.Body>
      </Modal>
    </>
  )
}

export default Footer
