import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, useLocation } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import Header from './components/Header'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import CompareBar from './components/CompareBar'
import SocketManager from './components/SocketManager'


import HomeScreen from './screens/HomeScreen'
import SmartSearchScreen from './screens/SmartSearchScreen'
import CompareScreen from './screens/CompareScreen'
import ProductScreen from './screens/ProductScreen'
import CartScreen from './screens/CartScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import GoogleAuthScreen from './screens/GoogleAuthScreen'
import VerifyOtpScreen from './screens/VerifyOtpScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen'
import TrackingScreen from './screens/TrackingScreen'
import WarehouseSettingsScreen from './screens/WarehouseSettingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import OrderScreen from './screens/OrderScreen'
import UserListScreen from './screens/UserListScreen'
import UserEditScreen from './screens/UserEditScreen'
import ProductListScreen from './screens/ProductListScreen'
import AdminRevenueScreen from './screens/AdminRevenueScreen'
import ProductEditScreen from './screens/ProductEditScreen'
import OrderListScreen from './screens/OrderListScreen'
import ProductAddScreen from './screens/ProductAddScreen'
import FilteredProductsScreen from './screens/FilteredProductsScreen'
import AddressBookScreen from './screens/AddressBookScreen'
import PlaceOrderScreen from './screens/PlaceOrderScreen'
import DatHangScreen from './screens/DatHangScreen'
import MyOrderScreen from './screens/MyOrderScreen'

// VOUCHER ADMIN
import VoucherListScreen from './screens/VoucherListScreen'
import VoucherEditScreen from './screens/VoucherEditScreen'

const ScrollToTop = () => {

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <Router>
      <Header />
      <main className="page-layout"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-main)',
          paddingTop: '24px',
          paddingBottom: '48px',
        }}
      >
        <Container>

          {/* ===== FILTER PAGES ===== */}
          <Route path='/brand/:value' component={FilteredProductsScreen} exact />
          <Route path='/brand/:value/page/:pageNumber' component={FilteredProductsScreen} exact />
          <Route path='/price/:value' component={FilteredProductsScreen} exact />
          <Route path='/price/:value/page/:pageNumber' component={FilteredProductsScreen} exact />

          {/* ===== PRODUCT ===== */}
          <Route path='/product/:id' component={ProductScreen} />
          <Route path='/cart/:id?' component={CartScreen} />

          {/* ===== AUTH / USER ===== */}
          <Route path='/login' component={LoginScreen} />
          <Route path='/register' component={RegisterScreen} />
          <Route path='/google-auth' component={GoogleAuthScreen} />
          <Route path='/verify-otp' component={VerifyOtpScreen} />
          <Route path='/forgotpassword' component={ForgotPasswordScreen} />
          <Route path='/resetpassword/:token' component={ResetPasswordScreen} />
          <Route path='/profile' component={ProfileScreen} />
          <Route path='/addresslist' component={AddressBookScreen} />
          <Route path='/placeorder' component={PlaceOrderScreen} />
          <Route path='/dathang' component={DatHangScreen} />

          {/* ===== ORDER ===== */}
          <Route path='/checkout' component={CheckoutScreen} />
          <Route path='/order/:id' component={OrderScreen} />
          <Route path='/tracking/:id' component={TrackingScreen} />
          <Route path='/myorders' component={MyOrderScreen} />

          {/* ===== ADMIN ===== */}
          <Route path='/admin/userlist' component={UserListScreen} />
          <Route path='/admin/user/:id/edit' component={UserEditScreen} />
          <Route path='/admin/productlist' component={ProductListScreen} exact />
          <Route path='/admin/productlist/:pageNumber' component={ProductListScreen} exact />
          <Route path='/admin/revenue' component={AdminRevenueScreen} exact />
          <Route path='/admin/product/new' component={ProductAddScreen} />
          <Route path='/admin/product/:id/edit' component={ProductEditScreen} />
          <Route path='/admin/orderlist' component={OrderListScreen} />

          {/* ===== VOUCHER ADMIN ===== */}
          <Route path='/admin/voucherlist' component={VoucherListScreen} />
          <Route path='/admin/voucher/new' component={VoucherEditScreen} />
          <Route path='/admin/voucher/:id/edit' component={VoucherEditScreen} />

          <Route path='/admin/warehouse' component={WarehouseSettingsScreen} />

          {/* ===== SEARCH & HOME ===== */}

          <Route path='/search/:keyword' component={HomeScreen} exact />
          <Route path='/search/:keyword/page/:pageNumber' component={HomeScreen} exact />
          {/* MỚI (B3): Tìm kiếm bằng ngôn ngữ tự nhiên (AI) */}
          <Route path='/smart-search' component={SmartSearchScreen} exact />
          {/* MỚI (B7): So sánh sản phẩm */}
          <Route path='/compare' component={CompareScreen} exact />
          <Route path='/page/:pageNumber' component={HomeScreen} exact />
          <Route path='/' component={HomeScreen} exact />
          
          <ScrollToTop />
        </Container>
      </main>
      <Footer />
      <ChatWidget />
      <CompareBar />
      <SocketManager />
    </Router>
  )
}

export default App