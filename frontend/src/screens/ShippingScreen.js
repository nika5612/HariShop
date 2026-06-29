import React, { useState, useEffect } from 'react'
import { Form, Button, Spinner, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import FormContainer from '../components/FormContainer'
import CheckoutSteps from '../components/CheckoutSteps'
import { saveShippingAddress, saveDeliveryFee } from '../actions/cartActions'

const ShippingScreen = ({ history }) => {
  const [error, setError] = useState('');
  const cart = useSelector((state) => state.cart)
  const { shippingAddress, cartItems } = cart

  // Custom 4 fields
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')

  // Recover existing detail string if possible
  useEffect(() => {
    if (shippingAddress.detail) {
      const parts = shippingAddress.detail.split(', ');
      if (parts.length > 1) {
        setHouseNumber(parts[0]);
        setStreet(parts.slice(1).join(', '));
      } else {
        setHouseNumber(shippingAddress.detail);
      }
    }
  }, [shippingAddress.detail]);

  // Location data
  const [provinces, setProvinces] = useState([])
  const [combinedWards, setCombinedWards] = useState([]) // holds { ward, district }
  const [loadingWards, setLoadingWards] = useState(false)

  // Selected values
  const [provinceObj, setProvinceObj] = useState(null)
  const [selectedCombinedWard, setSelectedCombinedWard] = useState(null) // { wardObj, districtObj }

  // Quotes
  const [quotes, setQuotes] = useState([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showAllQuotes, setShowAllQuotes] = useState(false)

  const dispatch = useDispatch()

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
    setQuotes([]);
    setSelectedQuote(null);
    setLoadingWards(true);
    
    try {
      // 1. Fetch dists
      const { data: dData } = await axios.get(`/api/shipping/districts?provinceId=${encodeURIComponent(JSON.stringify(p))}`);
      if (dData.success && dData.data.length > 0) {
        const dists = dData.data;

        // 2. Fetch all wards for these dists in parallel
        const allWards = [];
        // To not overwhelm the server totally, slice it or just Promise.all
        // Usually 10-30 districts. Node handles 30 rapid requests fine
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

        // Sort alphabetically
        allWards.sort((a,b) => a.displayName.localeCompare(b.displayName));
        setCombinedWards(allWards);
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingWards(false);
    }
  }

  const handleCombinedWardChange = async (e) => {
    const val = e.target.value;
    if (!val) return;
    const cw = JSON.parse(val);
    setSelectedCombinedWard(cw);

    // Call fetch quotes now
    fetchQuotes(cw.wardObj, cw.districtObj, provinceObj);
  }

  const fetchQuotes = async (wObj, dObj, pObj) => {
    if (!wObj || !dObj || !pObj) return;
    setLoadingQuotes(true);
    setQuotes([]);
    setSelectedQuote(null);

    try {
      const toAddress = {
        province: pObj.provinceName,
        district: dObj.districtName,
        ward: wObj.wardName,
        districtCode: dObj.ghnDistrictId,
        wardCode: wObj.ghnWardCode,
        provinceCode: pObj.vtpProvinceId,
      }
      
      const { data } = await axios.post('/api/shipping/quotes', {
        cartItems,
        toAddress
      });

      if (data.success && data.quotes && data.quotes.length > 0) {
        setQuotes(data.quotes);
        const cheapest = data.quotes.reduce((prev, curr) => parseFloat(prev.fee) < parseFloat(curr.fee) ? prev : curr);
        setSelectedQuote(cheapest);
      }
    } catch (error) {
      console.error('Quotes error:', error);
    } finally {
      setLoadingQuotes(false);
    }
  }

  const submitHandler = (e) => {
    e.preventDefault()
    
    const requiredFields = [
      { name: 'Tỉnh/thành phố', value: provinceObj?.provinceName },
      { name: 'Phường/xã/đặc khu', value: selectedCombinedWard },
      { name: 'Đường/thôn/xóm', value: street.trim() },
      { name: 'Số nhà, hẻm, ngách, ngõ', value: houseNumber.trim() }
    ];
    
    for (const field of requiredFields) {
      if (!field.value) {
        setError(`❌ Vui lòng nhập/chọn đủ thông tin: ${field.name}`);
        setTimeout(() => setError(''), 5000);
        return;
      }
    }

    if (!selectedQuote && quotes.length > 0) {
      setError(`❌ Vui lòng chờ chức năng tính phí giao hàng hoàn tất.`);
      return;
    }
    
    setError('');
    
    // Combine full detail string for DB
    const finalDetail = `${houseNumber.trim()}, ${street.trim()}`;

    const fullShippingAddress = {
      fullName: shippingAddress.fullName || 'Khách hàng', // fallback if needed or let user edit it
      phone: shippingAddress.phone || '000000',
      detail: finalDetail,
      province: provinceObj.provinceName,
      district: selectedCombinedWard.districtObj.districtName,
      ward: selectedCombinedWard.wardObj.wardName,
      ghnDistrictId: selectedCombinedWard.districtObj.ghnDistrictId,
      ghnWardCode: selectedCombinedWard.wardObj.ghnWardCode,
      vtpProvinceId: provinceObj.vtpProvinceId,
      vtpDistrictId: selectedCombinedWard.districtObj.vtpDistrictId,
      vtpWardId: selectedCombinedWard.wardObj.vtpWardId,
      shippingProvider: selectedQuote?.carrier || '',
      shippingServiceCode: selectedQuote?.serviceCode || '',
      shippingServiceName: selectedQuote?.serviceName || ''
    };

    dispatch(saveShippingAddress(fullShippingAddress));
    
    if (selectedQuote && selectedQuote.fee !== undefined) {
      dispatch(saveDeliveryFee(selectedQuote.fee));
    }

    history.push('/payment');
  };

  const selectStyle = {
    background: '#0f0f23',
    border: '1px solid rgba(51,255,204,0.4)',
    color: '#ffffff',
    borderRadius: '12px', 
    padding: '14px 16px',
    fontSize: '15px'
  }

  return (
    <FormContainer>
      <CheckoutSteps step1 step2 />
      <h1 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '2rem' }}>
        <i className='fas fa-shipping-fast me-3' style={{ color: '#33FFCC' }}></i>
        Thông Tin Vận Chuyển
      </h1>
      <Form noValidate onSubmit={submitHandler}>
        
        <Row style={{ marginBottom: '1.5rem' }}>
          <Col md={6} style={{ marginBottom: '1rem' }}>
            <Form.Group controlId='province'>
              <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Tỉnh/thành phố *</Form.Label>
              <Form.Control as="select" style={selectStyle} value={provinceObj ? JSON.stringify(provinceObj) : ''} onChange={handleProvinceChange}>
                <option value="">Chọn Tỉnh/Thành</option>
                {provinces.map((p, i) => (
                  <option key={i} value={JSON.stringify(p)}>{p.provinceName}</option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>
          <Col md={6} style={{ marginBottom: '1rem' }}>
            <Form.Group controlId='wardCombined'>
              <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>
                Phường/xã/đặc khu * 
                {loadingWards && <Spinner animation="border" size="sm" className="ms-2" style={{color: '#33FFCC'}}/>}
              </Form.Label>
              <Form.Control as="select" style={selectStyle} value={selectedCombinedWard ? JSON.stringify(selectedCombinedWard) : ''} onChange={handleCombinedWardChange} disabled={!provinceObj || loadingWards}>
                <option value="">{loadingWards ? 'Đang tải khu vực...' : 'Chọn Phường/Xã'}</option>
                {combinedWards.map((cw, i) => (
                  <option key={i} value={JSON.stringify(cw)}>{cw.displayName}</option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group controlId='street' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Đường/thôn/xóm *</Form.Label>
          <Form.Control
            type='text'
            placeholder='Tên đường, mốc nổi bật...'
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            style={selectStyle}
          />
        </Form.Group>

        <Form.Group controlId='houseNumber' style={{ marginBottom: '1.5rem' }}>
          <Form.Label style={{ color: '#ffffff', fontWeight: '500' }}>Số nhà, hẻm, ngách, ngõ *</Form.Label>
          <Form.Control
            type='text'
            placeholder='Nhập số nhà...'
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            style={selectStyle}
          />
        </Form.Group>

        {loadingQuotes && (
          <div className="d-flex align-items-center mb-3" style={{ color: '#33FFCC' }}>
            <Spinner animation="border" size="sm" className="me-2" />
            <span>Đang tự động lấy phí vận chuyển rẻ nhất...</span>
          </div>
        )}

        {quotes.length > 0 && selectedQuote && (
          <div style={{
            background: 'rgba(51,255,204,0.05)',
            border: '1px solid rgba(51,255,204,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{ color: '#33FFCC', fontSize: '16px', fontWeight: '600' }}>
              <i className="fas fa-box me-2"></i>Dịch vụ giao hàng mặc định (Rẻ nhất)
            </h5>
            <div className="d-flex justify-content-between align-items-center mt-3">
               <div>
                 <strong style={{color: '#fff', fontSize: '15px'}}>{selectedQuote.serviceName || selectedQuote.carrier.toUpperCase()}</strong>
                 <div style={{color: '#aaa', fontSize: '14px', marginTop: '4px'}}>Thời gian: {selectedQuote.etaLabel || 'Đang ước tính'}</div>
               </div>
               <div style={{color: '#33FFCC', fontWeight: 'bold', fontSize: '18px'}}>
                 {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedQuote.fee)}
               </div>
            </div>

            {quotes.length > 1 && !showAllQuotes && (
              <div 
                style={{color: '#33FFCC', cursor: 'pointer', fontSize: '14px', marginTop: '12px', textDecoration: 'underline'}}
                onClick={() => setShowAllQuotes(true)}
              >
                Nhấn xem thông tin các đơn vị khác
              </div>
            )}

            {showAllQuotes && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                {quotes.map((q, i) => (
                  <div 
                    key={i} 
                    style={{
                      display: 'flex', justifyContent: 'space-between', padding: '10px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: selectedQuote === q ? '1px solid #33FFCC' : '1px solid transparent',
                      background: selectedQuote === q ? 'rgba(51,255,204,0.1)' : 'transparent'
                    }}
                    onClick={() => setSelectedQuote(q)}
                  >
                     <div style={{color: '#fff'}}>
                       <Form.Check 
                         type="radio" 
                         inline
                         checked={selectedQuote === q}
                         onChange={() => setSelectedQuote(q)}
                       />
                       {q.serviceName || q.carrier.toUpperCase()}
                     </div>
                     <span style={{color: '#33FFCC'}}>
                       {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(q.fee)}
                     </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(220,53,69,0.15)',
            border: '1px solid #dc3545',
            color: '#ff6b6b',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.5rem',
            fontSize: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        <Button 
          type='submit' 
          disabled={!!error || loadingQuotes}
          style={{
            background: error ? '#666' : '#33FFCC',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            width: '100%',
            boxShadow: error ? 'none' : '0 4px 15px rgba(51,255,204,0.3)',
            marginTop: '1.5rem',
            opacity: (error || loadingQuotes) ? 0.7 : 1,
            cursor: (error || loadingQuotes) ? 'not-allowed' : 'pointer'
          }}
        >
          {loadingQuotes ? <Spinner animation="border" size="sm" /> : <><i className='fas fa-arrow-right me-2'></i>Tiếp Tục Đến Thanh Toán</>}
        </Button>
      </Form>
    </FormContainer>
  )
}

export default ShippingScreen
