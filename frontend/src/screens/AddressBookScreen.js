import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Spinner } from 'react-bootstrap'
import axios from 'axios'
import Message from '../components/Message'
import Loader from '../components/Loader'
import {
  listAddresses,
  addAddress,
  deleteAddress,
  setDefaultAddress,
} from '../actions/addressActions'

const AddressBookScreen = ({ history }) => {
  const dispatch = useDispatch()

  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [street, setStreet]       = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  
  const [isDefault, setIsDefault] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState('');

  // Location logic
  const [provinces, setProvinces] = useState([])
  const [combinedWards, setCombinedWards] = useState([])
  const [loadingWards, setLoadingWards] = useState(false)
  
  const [provinceObj, setProvinceObj] = useState(null)
  const [selectedCombinedWard, setSelectedCombinedWard] = useState(null)

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const addressState = useSelector((state) => state.address)
  const { loading, formError: reduxError, addresses } = addressState
  const formError = error || reduxError;

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
    } else {
      dispatch(listAddresses())
    }
  }, [dispatch, history, userInfo])

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
    const val = e.target.value;
    if (!val) {
      setProvinceObj(null);
      setCombinedWards([]);
      setSelectedCombinedWard(null);
      return;
    }
    
    const p = JSON.parse(val);
    setProvinceObj(p);
    setCombinedWards([]);
    setSelectedCombinedWard(null);
    setLoadingWards(true);
    
    try {
      const { data: dData } = await axios.get(`/api/shipping/districts?provinceId=${encodeURIComponent(JSON.stringify(p))}`);
      if (dData.success && dData.data.length > 0) {
        const dists = dData.data;

        const allWards = [];
        await Promise.all(dists.map(async (d) => {
           try {
             const { data: wData } = await axios.get(`/api/shipping/wards?districtId=${encodeURIComponent(JSON.stringify(d))}`)
             if(wData.success && wData.data.length > 0) {
                wData.data.forEach(w => {
                  allWards.push({
                    wardObj: w,
                    districtObj: d,
                    displayName: `${w.wardName} (${d.districtName})`
                  })
                })
             }
           } catch(e) {}
        }));

        allWards.sort((a,b) => a.displayName.localeCompare(b.displayName));
        setCombinedWards(allWards);
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingWards(false);
    }
  }

  const handleCombinedWardChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    setSelectedCombinedWard(JSON.parse(val));
  }

  const submitHandler = (e) => {
    e.preventDefault()
    
    const requiredFields = [
      { name: 'Họ và tên', value: fullName },
      { name: 'Số điện thoại', value: phone },
      { name: 'Tỉnh/thành phố', value: provinceObj },
      { name: 'Phường/xã/đặc khu', value: selectedCombinedWard },
      { name: 'Đường/thôn/xóm', value: street },
      { name: 'Số nhà, hẻm, ngách, ngõ', value: houseNumber }
    ]

    for (const field of requiredFields) {
      if (!field.value || field.value.toString().trim() === '') {
        setError(`Vui lòng nhập/chọn đủ: ${field.name}`);
        setTimeout(() => setError(''), 5000);
        return;
      }
    }

    const finalDetail = `${houseNumber.trim()}, ${street.trim()}`
    
    const addressData = { 
      fullName, 
      phone, 
      detail: finalDetail, 
      province: provinceObj.provinceName,
      district: selectedCombinedWard.districtObj.districtName,
      ward: selectedCombinedWard.wardObj.wardName,
      ghnDistrictId: selectedCombinedWard.districtObj.ghnDistrictId,
      ghnWardCode: selectedCombinedWard.wardObj.ghnWardCode,
      vtpProvinceId: provinceObj.vtpProvinceId,
      vtpDistrictId: selectedCombinedWard.districtObj.vtpDistrictId,
      vtpWardId: selectedCombinedWard.wardObj.vtpWardId,
      isDefault 
    }
    
    dispatch(addAddress(addressData))
    dispatch({ type: 'ADDRESS_RESET' })
    
    // reset form
    setFullName(''); setPhone(''); setStreet(''); setHouseNumber('');
    setProvinceObj(null); setSelectedCombinedWard(null);
    setCombinedWards([]);
    setIsDefault(false); setShowForm(false);
    setError('');
  }

  const deleteHandler = (id) => {
    if (window.confirm('Bạn chắc chắn muốn xoá địa chỉ này?')) {
      dispatch(deleteAddress(id))
      dispatch({ type: 'ADDRESS_RESET' })
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#0f0f23',
    border: '1px solid rgba(51,255,204,0.4)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
  }

  const labelStyle = {
    color: '#b8bcc8',
    fontSize: '13px',
    marginBottom: '6px',
    display: 'block',
  }

  const cardStyle = {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(51,255,204,0.15)',
    padding: '20px',
    marginBottom: '16px',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '1.6rem' }}>
          <i className='fas fa-map-marker-alt me-2' style={{ color: '#33FFCC' }}></i>
          Danh Sách địa chỉ
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#33FFCC', border: 'none', borderRadius: '10px',
            padding: '10px 20px', color: '#0f0f23',
            fontWeight: '700', fontSize: '14px', cursor: 'pointer',
          }}
        >
          <i className='fas fa-plus me-2'></i>
          {showForm ? 'Đóng' : 'Thêm địa chỉ'}
        </button>
      </div>

      {loading && <Loader />}
      {formError && (
        <div style={{
          background: 'rgba(220,53,69,0.15)',
          border: '1px solid #dc3545',
          color: '#ff6b6b',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '1rem',
          fontSize: '15px'
        }}>
          {formError}
        </div>
      )}

      {addresses && addresses.length === 0 && (
        <Message>Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ mới!</Message>
      )}

      {addresses && addresses.map((addr) => (
        <div key={addr._id} style={{
          ...cardStyle,
          border: addr.isDefault
            ? '1px solid rgba(51,255,204,0.5)'
            : '1px solid rgba(51,255,204,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px' }}>
                  {addr.fullName}
                </span>
                <span style={{ color: '#b8bcc8', fontSize: '14px' }}>
                  {addr.phone}
                </span>
                {addr.isDefault && (
                  <span style={{
                    background: 'rgba(51,255,204,0.15)',
                    color: '#33FFCC',
                    border: '1px solid #33FFCC',
                    borderRadius: '20px',
                    padding: '2px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    ✓ Mặc định
                  </span>
                )}
              </div>
              <div style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: '1.6' }}>
                {[addr.detail, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {!addr.isDefault && (
                <button
                  onClick={() => { dispatch(setDefaultAddress(addr._id)); dispatch({ type: 'ADDRESS_RESET' }); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #33FFCC',
                    color: '#33FFCC',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Đặt mặc định
                </button>
              )}
              <button
                onClick={() => deleteHandler(addr._id)}
                style={{
                  background: 'rgba(220,53,69,0.15)',
                  border: '1px solid rgba(220,53,69,0.4)',
                  color: '#ff6b6b',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <i className='fas fa-trash me-1'></i>Xoá
              </button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={{
          background: '#1a1a2e',
          borderRadius: '16px',
          border: '1px solid rgba(51,255,204,0.35)',
          padding: '28px',
          marginTop: '8px',
        }}>
          <h5 style={{ color: '#33FFCC', fontWeight: '700', marginBottom: '24px' }}>
            <i className='fas fa-plus-circle me-2'></i>Thêm địa chỉ mới
          </h5>

          <form onSubmit={submitHandler}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={labelStyle}>Họ và tên *</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder='Nguyễn Văn A'
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Số điện thoại *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='0xxxxxxxxx'
                  style={inputStyle}
                />
              </div>

              {/* ===== 1. SỐ NHÀ ===== */}
              <div>
                <label style={labelStyle}>Số nhà, hẻm, ngách, ngõ *</label>
                <input
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder='VD: Số 56, hẻm 2'
                  style={inputStyle}
                />
              </div>
              
              {/* ===== 2. TỈNH THÀNH ===== */}
              <div>
                <label style={labelStyle}>Tỉnh/thành phố *</label>
                <select style={inputStyle} value={provinceObj ? JSON.stringify(provinceObj) : ''} onChange={handleProvinceChange}>
                  <option value="">Chọn Tỉnh/Thành</option>
                  {provinces.map((p, i) => (
                    <option key={i} value={JSON.stringify(p)}>{p.provinceName}</option>
                  ))}
                </select>
              </div>

              {/* ===== 3. PHƯỜNG XÃ ===== */}
              <div>
                <label style={labelStyle}>
                  Phường/xã/đặc khu *
                  {loadingWards && <Spinner animation="border" size="sm" className="ms-2" style={{color: '#33FFCC'}}/>}
                </label>
                <select style={inputStyle} value={selectedCombinedWard ? JSON.stringify(selectedCombinedWard) : ''} onChange={handleCombinedWardChange} disabled={!provinceObj || loadingWards}>
                  <option value="">{loadingWards ? 'Đang tải khu vực...' : 'Chọn Phường/Xã'}</option>
                  {combinedWards.map((cw, i) => (
                    <option key={i} value={JSON.stringify(cw)}>{cw.displayName}</option>
                  ))}
                </select>
              </div>

              {/* ===== 4. ĐƯỜNG PHỐ ===== */}
              <div>
                <label style={labelStyle}>Đường/thôn/xóm *</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder='(Gõ tên đường, do GHN không hỗ trợ chọn)'
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '24px', padding: '12px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
            }}>
              <input
                type='checkbox'
                id='isDefault'
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#33FFCC', cursor: 'pointer' }}
              />
              <label htmlFor='isDefault' style={{ color: '#b8bcc8', fontSize: '14px', cursor: 'pointer' }}>
                Đặt làm địa chỉ mặc định
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type='submit' style={{
                background: '#33FFCC', border: 'none', borderRadius: '10px',
                padding: '12px 28px', color: '#0f0f23',
                fontWeight: '700', fontSize: '15px', cursor: 'pointer',
              }}>
                <i className='fas fa-save me-2'></i>Lưu địa chỉ
              </button>
              <button type='button' onClick={() => setShowForm(false)} style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#b8bcc8', borderRadius: '10px',
                padding: '12px 20px', fontSize: '15px', cursor: 'pointer',
              }}>
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AddressBookScreen
