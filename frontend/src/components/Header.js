import React, { useState, useEffect } from 'react'
import { Route } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { LinkContainer } from 'react-router-bootstrap'
import { Navbar, Nav, Container, NavDropdown, Button, Badge } from 'react-bootstrap'
import SearchBox from './SearchBox'
import NotificationBell from './NotificationBell'
import { logout } from '../actions/userActions'

const Header = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [showThemeAnim, setShowThemeAnim] = useState(false)
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setShowThemeAnim(true)
    setTheme(theme === 'dark' ? 'light' : 'dark')
    setTimeout(() => setShowThemeAnim(false), 300)
  }

  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin
  const cart = useSelector((state) => state.cart)
  const { cartItems } = cart

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0)

  const logoutHandler = () => {
    dispatch(logout())
  }

  return (
    <header className="header-main">
      <Navbar expand='lg' collapseOnSelect className="navbar-professional">
        <Container>
          {/* LOGO */}
          <LinkContainer to='/'>
            <Navbar.Brand className="logo-gradient pro-logo">
              Hari Shop
            </Navbar.Brand>
          </LinkContainer>

          <Navbar.Toggle 
            aria-controls='basic-navbar-nav' 
            aria-label="Toggle navigation"
            className="navbar-toggle-custom"
          />
          <Navbar.Collapse id='basic-navbar-nav' className="justify-content-center">
            
            {/* SEARCH BOX - Responsive */}
            <div className="search-wrapper mx-auto d-none d-lg-block">
              <Route render={({ history }) => <SearchBox history={history} />} />
            </div>

            {/* Right Nav */}
            <Nav className='ms-auto align-items-center nav-links-container'>
              
              {/* THEME TOGGLE */}
              <Button 
                variant="link" 
                onClick={toggleTheme} 
                className={`theme-toggle ${showThemeAnim ? 'rotate-anim' : ''}`}
                aria-label="Toggle light/dark theme"
                title="Chuyển đổi giao diện Sáng / Tối"
              >
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} theme-icon`}></i>
              </Button>

              {/* THÔNG BÁO — chỉ hiện với Admin */}
              {/* THÔNG BÁO — Admin thấy thông báo quản trị, Khách hàng thấy thông báo đơn hàng của mình */}
              {userInfo && userInfo.isAdmin && <NotificationBell scope='admin' />}
              {userInfo && !userInfo.isAdmin && <NotificationBell scope='customer' />}

              {/* CART WITH BADGE */}
              <LinkContainer to='/cart'>
                <Nav.Link className="nav-link-pro px-3 position-relative">
                  <i className='fas fa-shopping-cart me-1'></i> 
                  Giỏ Hàng
                  {cartCount > 0 && (
                    <Badge pill bg="primary" className="cart-badge">
                      {cartCount}
                    </Badge>
                  )}
                </Nav.Link>
              </LinkContainer>

              {/* USER */}
              {userInfo ? (
                <NavDropdown 
                  title={<span className="user-name">{userInfo.name}</span>} 
                  id='username'
                  className="user-dropdown"
                >
                  <LinkContainer to='/profile'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-user me-2'></i>Hồ sơ
                    </NavDropdown.Item>
                  </LinkContainer>
                  <NavDropdown.Item onClick={logoutHandler} className="dropdown-item-pro">
                    <i className='fas fa-sign-out-alt me-2'></i>Đăng xuất
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <LinkContainer to='/login'>
                  <Nav.Link className="nav-link-pro">
                    <i className='fas fa-user me-1'></i> Đăng Nhập
                  </Nav.Link>
                </LinkContainer>
              )}
              
              {/* ADMIN */}
              {userInfo && userInfo.isAdmin && (
                <NavDropdown 
                  title={<span className="admin-panel">Admin</span>} 
                  id='adminmenu'
                  className="admin-dropdown"
                >
                  <LinkContainer to='/admin/userlist'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-users me-2'></i>Người Dùng
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to='/admin/productlist'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-box me-2'></i>Sản Phẩm
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to='/admin/orderlist'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-shopping-bag me-2'></i>Đơn Hàng
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to='/admin/revenue'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-chart-line me-2'></i>Thống Kê
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to='/admin/voucherlist'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-ticket-alt me-2'></i>Voucher
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to='/admin/warehouse'>
                    <NavDropdown.Item className="dropdown-item-pro">
                      <i className='fas fa-warehouse me-2'></i>Kho gửi hàng
                    </NavDropdown.Item>
                  </LinkContainer>
                </NavDropdown>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  )
}

export default Header