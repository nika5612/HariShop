import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'

const FormContainer = ({ children }) => {
  return (
    <Container>
      <Row className='justify-content-md-center' style={{ margin: '2rem 0' }}>
        <Col xs={12} md={8} lg={6}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(51,255,204,0.15)',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            {children}
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default FormContainer
