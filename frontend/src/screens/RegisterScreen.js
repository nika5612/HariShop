import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { register } from '../actions/userActions'

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const inputStyle = {
  background: '#0f0f23',
  border: '1px solid rgba(51,255,204,0.4)',
  color: '#ffffff',
  borderRadius: '12px',
  padding: '14px 16px',
}

const labelStyle = { color: '#ffffff', fontWeight: '500' }

const RegisterScreen = ({ location, history }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [detail, setDetail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  // ===== Dropdown địa chỉ 3 cấp (Tỉnh → Quận → Phường) =====
  // Tái sử dụng đúng logic/API đang dùng ở AddressBookScreen
  const [provinces, setProvinces] = useState([])
  const [combinedWards, setCombinedWards] = useState([])
  const [loadingWards, setLoadingWards] = useState(false)
  const [provinceObj, setProvinceObj] = useState(null)
  const [selectedCombinedWard, setSelectedCombinedWard] = useState(null)

  const dispatch = useDispatch()

  const userRegister = useSelector((state) => state.userRegister)
  const { loading, error: registerError, userInfo } = userRegister

  const redirect = location.search ? location.search.split('=')[1] : '/'

  // A2: Sau khi đăng ký, tài khoản cần xác nhận OTP trước khi được đăng nhập
  useEffect(() => {
    if (userInfo && userInfo.needOtp) {
      history.push(`/verify-otp?email=${encodeURIComponent(userInfo.email)}`)
    }
  }, [history, userInfo])

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data } = await axios.get('/api/shipping/provinces')
        if (data.success) {
          setProvinces(data.data)
        }
      } catch (err) {
        console.error('Error fetching provinces:', err)
      }
    }
    fetchProvinces()
  }, [])

  const handleProvinceChange = async (e) => {
    const val = e.target.value
    if (!val) {
      setProvinceObj(null)
      setCombinedWards([])
      setSelectedCombinedWard(null)
      return
    }

    const p = JSON.parse(val)
    setProvinceObj(p)
    setCombinedWards([])
    setSelectedCombinedWard(null)
    setLoadingWards(true)

    try {
      const { data: dData } = await axios.get(
        `/api/shipping/districts?provinceId=${encodeURIComponent(JSON.stringify(p))}`
      )
      if (dData.success && dData.data.length > 0) {
        const dists = dData.data
        const allWards = []
        await Promise.all(
          dists.map(async (d) => {
            try {
              const { data: wData } = await axios.get(
                `/api/shipping/wards?districtId=${encodeURIComponent(JSON.stringify(d))}`
              )
              if (wData.success && wData.data.length > 0) {
                wData.data.forEach((w) => {
                  allWards.push({
                    wardObj: w,
                    districtObj: d,
                    displayName: `${w.wardName} (${d.districtName})`,
                  })
                })
              }
            } catch (e) {}
          })
        )

        allWards.sort((a, b) => a.displayName.localeCompare(b.displayName))
        setCombinedWards(allWards)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingWards(false)
    }
  }

  const handleCombinedWardChange = (e) => {
    const val = e.target.value
    if (!val) return
    setSelectedCombinedWard(JSON.parse(val))
  }

  const submitHandler = (e) => {
    e.preventDefault()
    setError('')

    // Existing validations
    if (!validateEmail(email)) {
      setError('Email không đúng định dạng')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.')
      return
    }
    if (phone.length !== 10 || !/^[0-9]{10}$/.test(phone)) {
      setError('Số điện thoại phải đúng 10 chữ số.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự.')
      return
    }

    // Address validation - bắt buộc chọn đủ 3 cấp + số nhà/tên đường
    const requiredFields = [
      { name: 'Số nhà, tên đường', value: detail.trim() },
      { name: 'Tỉnh/Thành phố', value: provinceObj },
      { name: 'Phường/Xã', value: selectedCombinedWard },
    ]
    for (const field of requiredFields) {
      if (!field.value) {
        setError(`❌ Vui lòng nhập/chọn đủ: ${field.name}`)
        setTimeout(() => setError(''), 5000)
        return
      }
    }

    // Tạo address object đầy đủ, đồng bộ với AddressBookScreen
    const addressObj = {
      fullName: name.trim(),
      phone: phone.trim(),
      province: provinceObj.provinceName,
      district: selectedCombinedWard.districtObj.districtName,
      ward: selectedCombinedWard.wardObj.wardName,
      detail: detail.trim(),
      ghnDistrictId: selectedCombinedWard.districtObj.ghnDistrictId,
      ghnWardCode: selectedCombinedWard.wardObj.ghnWardCode,
      vtpProvinceId: provinceObj.vtpProvinceId,
      vtpDistrictId: selectedCombinedWard.districtObj.vtpDistrictId,
      vtpWardId: selectedCombinedWard.wardObj.vtpWardId,
    }

    dispatch(register(name, phone, email, password, addressObj))
  }

  return (
    <FormContainer>
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '1.5rem' }}>
        <i className='fas fa-user-plus me-3' style={{ color: '#33FFCC' }}></i>Đăng Ký
      </h1>

      {registerError && <Message variant='danger'>{registerError}</Message>}
      {loading && <Loader />}

      {error && (
        <div
          style={{
            background: 'rgba(220,53,69,0.15)',
            border: '1px solid #dc3545',
            color: '#ff6b6b',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.5rem',
            fontSize: '15px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <Form onSubmit={submitHandler} autoComplete='off'>
        <Form.Group controlId='name' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Họ và tên *</Form.Label>
          <Form.Control
            type='text'
            placeholder='Nhập họ và tên đầy đủ'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete='off'
            style={inputStyle}
          />
        </Form.Group>

        <Form.Group controlId='phone' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Số điện thoại *</Form.Label>
          <Form.Control
            type='tel'
            placeholder='Nhập số điện thoại'
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            required
            maxLength={10}
            autoComplete='off'
            style={inputStyle}
          />
          <Form.Text className='text-muted' style={{ fontSize: '0.85rem', color: '#b8bcc8 !important' }}>
            Ví dụ: 0123456789 (10 số)
          </Form.Text>
        </Form.Group>

        <Form.Group controlId='email' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Email *</Form.Label>
          <Form.Control
            type='email'
            placeholder='Nhập email của bạn (VD: example@gmail.com)'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete='new-email'
            style={inputStyle}
          />
        </Form.Group>

        <Form.Group controlId='detail' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Số nhà, tên đường *</Form.Label>
          <Form.Control
            as='textarea'
            rows={2}
            placeholder='Số nhà, tên đường, địa danh nổi bật...'
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Form.Group>

        <Form.Group controlId='province' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Tỉnh/Thành phố *</Form.Label>
          <Form.Control
            as='select'
            style={inputStyle}
            value={provinceObj ? JSON.stringify(provinceObj) : ''}
            onChange={handleProvinceChange}
          >
            <option value=''>Chọn Tỉnh/Thành</option>
            {provinces.map((p, i) => (
              <option key={i} value={JSON.stringify(p)}>
                {p.provinceName}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        <Form.Group controlId='ward' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>
            Phường/Xã *
            {loadingWards && <Spinner animation='border' size='sm' className='ms-2' style={{ color: '#33FFCC' }} />}
          </Form.Label>
          <Form.Control
            as='select'
            style={inputStyle}
            value={selectedCombinedWard ? JSON.stringify(selectedCombinedWard) : ''}
            onChange={handleCombinedWardChange}
            disabled={!provinceObj || loadingWards}
          >
            <option value=''>{loadingWards ? 'Đang tải khu vực...' : 'Chọn Phường/Xã'}</option>
            {combinedWards.map((cw, i) => (
              <option key={i} value={JSON.stringify(cw)}>
                {cw.displayName}
              </option>
            ))}
          </Form.Control>
          <Form.Text className='text-muted' style={{ fontSize: '0.85rem', color: '#b8bcc8 !important' }}>
            Chọn Tỉnh/Thành trước để hiện danh sách Phường/Xã (đã gộp Quận tương ứng)
          </Form.Text>
        </Form.Group>

        <Form.Group controlId='password' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Mật khẩu *</Form.Label>
          <Form.Control
            type='password'
            placeholder='Tạo mật khẩu mạnh (ít nhất 6 ký tự)'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete='new-password'
            style={inputStyle}
          />
        </Form.Group>

        <Form.Group controlId='confirmPassword' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={labelStyle}>Nhập lại mật khẩu *</Form.Label>
          <Form.Control
            type='password'
            placeholder='Xác nhận mật khẩu'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete='new-password'
            style={inputStyle}
          />
        </Form.Group>

        <Button
          type='submit'
          disabled={!!error || loading}
          style={{
            width: '100%',
            background: error || loading ? '#666' : 'linear-gradient(135deg, #33FFCC, #00D4AA)',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '16px',
            boxShadow: error || loading ? 'none' : '0 6px 20px rgba(51,255,204,0.4)',
            marginTop: '1rem',
            opacity: error || loading ? 0.7 : 1,
            cursor: error || loading ? 'not-allowed' : 'pointer',
          }}
        >
          <i className='fas fa-user-plus me-2'></i>
          {loading ? 'Đang tạo...' : 'Tạo Tài Khoản'}
        </Button>
      </Form>

      {/* MỚI (B11): Đăng ký/Đăng nhập nhanh với Google */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#666' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }}></div>
        <span style={{ padding: '0 12px', fontSize: '13px' }}>hoặc</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }}></div>
      </div>
      <Button
        onClick={() => { window.location.href = '/api/users/auth/google' }}
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#3c4043',
          fontWeight: '600',
          padding: '14px',
          borderRadius: '12px',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        <img
          src='https://developers.google.com/identity/images/g-logo.png'
          alt='Google'
          style={{ width: 18, height: 18 }}
        />
        Tiếp Tục Với Google
      </Button>

      <Row style={{ marginTop: '2rem' }}>
        <Col style={{ textAlign: 'center', color: '#b8bcc8' }}>
          Đã Có Tài Khoản?{' '}
          <Link
            to={redirect ? `/login?redirect=${redirect}` : '/login'}
            style={{ color: '#33FFCC', fontWeight: '600', textDecoration: 'none' }}
          >
            Đăng Nhập Ngay
          </Link>
        </Col>
      </Row>
    </FormContainer>
  )
}

export default RegisterScreen