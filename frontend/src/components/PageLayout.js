import React from 'react'
import { Container } from 'react-bootstrap'
import Header from './Header'
import Footer from './Footer'

const PageLayout = ({ children, title, backButton = null, className = '' }) => {
  return (
    <div className={`page-layout ${className}`}>
      <Header />
      <main className='page-layout-main'>
        <Container className='page-layout-container'>
          {backButton}
          {title && (
            <h1 className='page-layout-title'>
              {title.icon && <i className={title.icon} />} 
              {title.text}
            </h1>
          )}
          <div className='page-layout-content'>
            {children}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}

export default PageLayout


