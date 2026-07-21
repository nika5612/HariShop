import axios from 'axios'
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import FormContainer from '../components/FormContainer'
import { listProductDetails, updateProduct } from '../actions/productActions'
import { PRODUCT_UPDATE_RESET } from '../constants/productConstants'

const inputStyle = {
  background: '#0f0f23',
  color: '#eef0f7',
  borderColor: 'rgba(51,255,204,0.35)',
}

const ProductEditScreen = ({ match, history }) => {
  const productId = match.params.id

  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [image, setImage] = useState('')
  // MỚI: ảnh banner riêng cho carousel trang chủ (tỉ lệ ngang, không bắt buộc)
  const [bannerImage, setBannerImage] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [weight, setWeight] = useState(0)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)

  // ── MỚI: color variant states ──────────────────────────────────
  const [colors, setColors] = useState([])
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#888888')
  const [colorStock, setColorStock] = useState(0)
  const [colorError, setColorError] = useState('')
  // MỚI: ảnh riêng cho màu đang chuẩn bị thêm + trạng thái upload theo từng dòng màu đã thêm
  const [colorImage, setColorImage] = useState('')
  const [colorImageUploading, setColorImageUploading] = useState(false)
  const [uploadingColorIndex, setUploadingColorIndex] = useState(null)

  // ── SỬA BUG: tồn kho thủ công cho sản phẩm KHÔNG dùng biến thể màu ──
  const [manualStock, setManualStock] = useState(0)

  // ── MỚI: state thông số kỹ thuật (specs) - tất cả không bắt buộc ──
  const [specs, setSpecs] = useState({
    ram: '', storage: '', battery: '', screenSize: '', screenType: '',
    camera: '', cameraFront: '', chip: '', os: '', sim: '', connectivity: '',
  })
  const updateSpec = (field, value) => setSpecs((s) => ({ ...s, [field]: value }))

  // ── MỚI (B8): state Flash Sale ──
  const [flashSale, setFlashSale] = useState({
    isActive: false, discountPercent: '', startsAt: '', endsAt: '',
  })
  const updateFlashSale = (field, value) => setFlashSale((s) => ({ ...s, [field]: value }))

  // Chuyển Date/ISO string sang định dạng input datetime-local ("YYYY-MM-DDTHH:mm")
  const toDatetimeLocal = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const dispatch = useDispatch()

  const productDetails = useSelector((state) => state.productDetails)
  const { loading, error, product } = productDetails

  const productUpdate = useSelector((state) => state.productUpdate)
  const {
    loading: loadingUpdate,
    error: errorUpdate,
    success: successUpdate,
  } = productUpdate

  useEffect(() => {
    if (successUpdate) {
      dispatch({ type: PRODUCT_UPDATE_RESET })
      history.push('/admin/productlist')
    } else {
      if (!product.name || product._id !== productId) {
        dispatch(listProductDetails(productId))
      } else {
        setName(product.name)
        setPrice(product.price)
        setImage(product.image)
        setBannerImage(product.bannerImage || '')
        setBrand(product.brand)
        setCategory(product.category)
        setWeight(product.weight || 0)
        setDescription(product.description)
        // ── SỬA BUG: load tồn kho thủ công ──────────────────────
        setManualStock(product.countInStock || 0)
        // ── MỚI: load màu từ sản phẩm hiện tại ──────────────────
        if (product.colors && product.colors.length > 0) {
          setColors(product.colors.map((c) => ({
            name:         c.name,
            hexCode:      c.hexCode || '#888888',
            countInStock: c.countInStock,
          })))
        }
        // ── MỚI: load thông số kỹ thuật từ sản phẩm hiện tại ────
        if (product.specs) {
          setSpecs({
            ram:          product.specs.ram          || '',
            storage:      product.specs.storage      || '',
            battery:      product.specs.battery       || '',
            screenSize:   product.specs.screenSize   || '',
            screenType:   product.specs.screenType   || '',
            camera:       product.specs.camera       || '',
            cameraFront:  product.specs.cameraFront  || '',
            chip:         product.specs.chip         || '',
            os:           product.specs.os           || '',
            sim:          product.specs.sim          || '',
            connectivity: product.specs.connectivity || '',
          })
        }
        // ── MỚI (B8): load Flash Sale từ sản phẩm hiện tại ──────
        if (product.flashSale) {
          setFlashSale({
            isActive:        !!product.flashSale.isActive,
            discountPercent: product.flashSale.discountPercent || '',
            startsAt:        toDatetimeLocal(product.flashSale.startsAt),
            endsAt:          toDatetimeLocal(product.flashSale.endsAt),
          })
        }
      }
    }
  }, [dispatch, history, productId, product, successUpdate])

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      const { data } = await axios.post('/api/upload', formData, config)
      setImage(data)
      setUploading(false)
    } catch (error) {
      console.error(error)
      setUploading(false)
    }
  }

  // MỚI: upload ảnh banner riêng cho carousel trang chủ
  const uploadBannerHandler = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setBannerUploading(true)
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      const { data } = await axios.post('/api/upload', formData, config)
      setBannerImage(data)
    } catch (error) {
      console.error(error)
      alert('Tải ảnh banner thất bại.')
    } finally {
      setBannerUploading(false)
    }
  }

  // Tổng stock từ tất cả màu
  const totalStock = colors.reduce((sum, c) => sum + Number(c.countInStock), 0)

  // MỚI: upload ảnh riêng cho màu đang chuẩn bị thêm (form "+ Thêm màu mới")
  const uploadColorImageHandler = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setColorImageUploading(true)
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      const { data } = await axios.post('/api/upload', formData, config)
      setColorImage(data)
    } catch (error) {
      console.error(error)
      alert('Tải ảnh cho màu thất bại.')
    } finally {
      setColorImageUploading(false)
    }
  }

  // MỚI: upload/thay ảnh cho 1 màu ĐÃ có trong danh sách
  const uploadExistingColorImageHandler = async (index, e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setUploadingColorIndex(index)
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      const { data } = await axios.post('/api/upload', formData, config)
      setColors((prev) => prev.map((c, i) => (i === index ? { ...c, image: data } : c)))
    } catch (error) {
      console.error(error)
      alert('Tải ảnh cho màu thất bại.')
    } finally {
      setUploadingColorIndex(null)
    }
  }

  const addColor = () => {
    if (!colorName.trim()) {
      setColorError('Vui lòng nhập tên màu')
      return
    }
    const isDuplicate = colors.some(
      (c) => c.name.toLowerCase() === colorName.trim().toLowerCase()
    )
    if (isDuplicate) {
      setColorError(`Màu "${colorName}" đã tồn tại`)
      return
    }
    setColorError('')
    setColors([
      ...colors,
      { name: colorName.trim(), hexCode: colorHex, countInStock: Number(colorStock), image: colorImage },
    ])
    setColorName('')
    setColorHex('#888888')
    setColorStock(0)
    setColorImage('')
  }

  const removeColor = (index) => {
    setColors(colors.filter((_, i) => i !== index))
  }

  const updateColorStock = (index, newStock) => {
    setColors(
      colors.map((c, i) =>
        i === index ? { ...c, countInStock: Number(newStock) } : c
      )
    )
  }

  const submitHandler = (e) => {
    e.preventDefault()
    // ── SỬA BUG: KHÔNG còn bắt buộc phải có màu — sản phẩm không
    // dùng biến thể màu sẽ dùng ô "Tồn kho thủ công" (manualStock) ──
    dispatch(
      updateProduct({
        _id:         productId,
        name,
        price,
        image,
        bannerImage,
        brand,
        category,
        description,
        weight,
        colors,
        specs,
        flashSale,
        // Có màu → tổng theo màu. Không có màu → dùng tồn kho nhập tay
        countInStock: colors.length > 0 ? totalStock : Number(manualStock) || 0,
      })
    )
  }

  return (
    <>
      <Link to='/admin/productlist' className='btn btn-light my-3'>
        Go Back
      </Link>
      <FormContainer>
        <h1>Sửa Sản Phẩm</h1>
        {loadingUpdate && <Loader />}
        {errorUpdate && <Message variant='danger'>{errorUpdate}</Message>}
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant='danger'>{error}</Message>
        ) : (
          <Form onSubmit={submitHandler}>

            <Form.Group controlId='name'>
              <Form.Label>Tên</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            <Form.Group controlId='price'>
              <Form.Label>Giá</Form.Label>
              <Form.Control
                type='number'
                placeholder='Enter price'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            <Form.Group controlId='image'>
              <Form.Label>Ảnh</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter image url'
                value={image}
                onChange={(e) => setImage(e.target.value)}
                style={inputStyle}
              />
              <Form.File
                id='image-file'
                label='Choose File'
                custom
                onChange={uploadFileHandler}
              />
              {uploading && <Loader />}
            </Form.Group>

            {/* MỚI: ảnh banner riêng cho carousel trang chủ — không bắt buộc.
                Nên dùng ảnh tỉ lệ ngang (khuyến nghị ~1600x600) để không bị
                phóng to/vỡ nét khi hiển thị full-width trên carousel. Để
                trống thì carousel sẽ tự dùng lại ảnh sản phẩm ở trên. */}
            <Form.Group controlId='bannerImage'>
              <Form.Label>
                Ảnh banner cho Carousel trang chủ{' '}
                <small style={{ color: '#94a3b8' }}>
                  (không bắt buộc — không cần đúng tỉ lệ, hệ thống sẽ tự động cắt vừa khung khi hiển thị.
                  Ưu tiên ảnh có độ phân giải cao (tối thiểu ~1200px chiều rộng) để không bị vỡ nét.
                  Nếu để trống sẽ tự dùng ảnh sản phẩm ở trên)
                </small>
              </Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter banner image url (optional)'
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                style={inputStyle}
              />
              <Form.File
                id='banner-image-file'
                label='Choose File'
                custom
                onChange={uploadBannerHandler}
              />
              {bannerUploading && <Loader />}
              {bannerImage && (
                <img
                  src={bannerImage}
                  alt='Banner preview'
                  style={{ marginTop: 10, maxWidth: '100%', maxHeight: 150, borderRadius: 8 }}
                />
              )}
            </Form.Group>

            <Form.Group controlId='brand'>
              <Form.Label>Hãng</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter brand'
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            <Form.Group controlId='weight'>
              <Form.Label>Trọng lượng (g)</Form.Label>
              <Form.Control
                type='number'
                placeholder='Enter weight (grams)'
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            <Form.Group controlId='category'>
              <Form.Label>Danh mục</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter category'
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            <Form.Group controlId='description'>
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as='textarea'
                rows={3}
                placeholder='Enter description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={inputStyle}
              />
            </Form.Group>

            {/* ── SỬA BUG: Tồn kho thủ công (chỉ hiện khi CHƯA có màu) ── */}
            {colors.length === 0 && (
              <Form.Group controlId='manualStock'>
                <Form.Label>Tồn kho (sản phẩm không dùng biến thể màu)</Form.Label>
                <Form.Control
                  type='number'
                  min={0}
                  placeholder='Nhập số lượng tồn kho'
                  value={manualStock}
                  onChange={(e) => setManualStock(e.target.value)}
                  style={inputStyle}
                />
                <Form.Text style={{ color: '#aaa', fontSize: 12 }}>
                  Nếu bạn thêm màu sắc bên dưới, tồn kho sẽ tự tính theo tổng số lượng từng màu thay vì ô này.
                </Form.Text>
              </Form.Group>
            )}

            {/* ── MỚI: Màu sắc & Tồn kho ── */}
            <Form.Group controlId='colors'>
              <Form.Label>
                Màu sắc & Số lượng tồn kho
                {colors.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#33FFCC', fontWeight: 'normal' }}>
                    Tổng: {totalStock} sản phẩm
                  </span>
                )}
              </Form.Label>

              {/* Danh sách màu hiện có */}
              {colors.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#1a1a35', padding: '8px 12px',
                        borderRadius: 8, marginBottom: 6,
                        border: '1px solid rgba(51,255,204,0.2)',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: c.hexCode,
                        border: '2px solid rgba(255,255,255,0.4)',
                        flexShrink: 0,
                      }} />
                      {/* MỚI: Thumbnail ảnh riêng của màu + nút đổi ảnh */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <label style={{ cursor: 'pointer', margin: 0 }} title='Bấm để đổi ảnh riêng cho màu này'>
                          {c.image ? (
                            <img
                              src={c.image}
                              alt={c.name}
                              style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(51,255,204,0.4)' }}
                            />
                          ) : (
                            <div style={{
                              width: 32, height: 32, borderRadius: 6,
                              border: '1px dashed rgba(255,255,255,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, color: '#666',
                            }}>
                              <i className='fas fa-image'></i>
                            </div>
                          )}
                          <input
                            type='file'
                            accept='image/*'
                            onChange={(e) => uploadExistingColorImageHandler(i, e)}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {uploadingColorIndex === i && (
                          <div style={{ position: 'absolute', top: -4, right: -4, fontSize: 10, color: '#33FFCC' }}>
                            <i className='fas fa-spinner fa-spin'></i>
                          </div>
                        )}
                      </div>
                      <span style={{ color: '#eef0f7', flex: 1, fontSize: 14 }}>
                        {c.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#aaa', fontSize: 12 }}>Còn:</span>
                        <Form.Control
                          type='number'
                          min={0}
                          value={c.countInStock}
                          onChange={(e) => updateColorStock(i, e.target.value)}
                          style={{ ...inputStyle, width: 70, padding: '3px 6px', fontSize: 13 }}
                        />
                        <span style={{ color: '#aaa', fontSize: 12 }}>cái</span>
                      </div>
                      <Button
                        size='sm'
                        variant='outline-danger'
                        onClick={() => removeColor(i)}
                        style={{ padding: '2px 8px', fontSize: 12 }}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form thêm màu mới */}
              <div style={{
                background: '#0f0f23',
                border: '1px dashed rgba(51,255,204,0.35)',
                borderRadius: 8, padding: 12,
              }}>
                <div style={{ fontSize: 12, color: '#33FFCC', marginBottom: 8 }}>
                  + Thêm màu mới
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Tên màu</div>
                    <Form.Control
                      type='text'
                      placeholder='VD: Đen, Trắng...'
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Màu</div>
                    <Form.Control
                      type='color'
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      title='Chọn màu hiển thị'
                      style={{
                        width: 48, height: 38, padding: 2,
                        background: '#0f0f23',
                        border: '1px solid rgba(51,255,204,0.35)',
                        borderRadius: 4, cursor: 'pointer',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Số lượng</div>
                    <Form.Control
                      type='number'
                      min={0}
                      placeholder='0'
                      value={colorStock}
                      onChange={(e) => setColorStock(e.target.value)}
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                  </div>
                  {/* MỚI: Ảnh riêng cho màu (tuỳ chọn) */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Ảnh màu (tuỳ chọn)</div>
                    <label style={{ cursor: 'pointer', margin: 0, display: 'block' }}>
                      {colorImage ? (
                        <img
                          src={colorImage}
                          alt='preview'
                          style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(51,255,204,0.4)' }}
                        />
                      ) : (
                        <div style={{
                          width: 38, height: 38, borderRadius: 6,
                          border: '1px dashed rgba(51,255,204,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: '#33FFCC', background: '#0f0f23',
                        }}>
                          {colorImageUploading ? <i className='fas fa-spinner fa-spin'></i> : <i className='fas fa-plus'></i>}
                        </div>
                      )}
                      <input
                        type='file'
                        accept='image/*'
                        onChange={uploadColorImageHandler}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <Button
                    variant='outline-info'
                    onClick={addColor}
                    style={{ height: 38, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    + Thêm
                  </Button>
                </div>
              </div>

              {colorError && (
                <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>
                  ⚠ {colorError}
                </div>
              )}

              {colors.length > 0 && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: 'rgba(51,255,204,0.05)',
                  border: '1px solid rgba(51,255,204,0.2)',
                  borderRadius: 6, fontSize: 13, color: '#33FFCC',
                }}>
                  📦 Tổng tồn kho: <strong>{totalStock}</strong> sản phẩm ({colors.length} màu)
                </div>
              )}
            </Form.Group>

            {/* ── MỚI: Thông số kỹ thuật ── */}
            <Form.Group controlId='specs' style={{ marginTop: 20 }}>
              <Form.Label>Thông số kỹ thuật <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: 12 }}>(không bắt buộc)</span></Form.Label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                background: '#0f0f23',
                border: '1px solid rgba(51,255,204,0.2)',
                borderRadius: 8,
                padding: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>RAM</div>
                  <Form.Control type='text' placeholder='VD: 12GB' value={specs.ram}
                    onChange={(e) => updateSpec('ram', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Bộ nhớ</div>
                  <Form.Control type='text' placeholder='VD: 1TB' value={specs.storage}
                    onChange={(e) => updateSpec('storage', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Pin (mAh)</div>
                  <Form.Control type='number' min={0} placeholder='VD: 4685' value={specs.battery}
                    onChange={(e) => updateSpec('battery', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Màn hình</div>
                  <Form.Control type='text' placeholder='VD: 6.9 inch' value={specs.screenSize}
                    onChange={(e) => updateSpec('screenSize', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Loại màn</div>
                  <Form.Control type='text' placeholder='VD: OLED 120Hz' value={specs.screenType}
                    onChange={(e) => updateSpec('screenType', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Camera sau</div>
                  <Form.Control type='text' placeholder='VD: 48MP + 12MP' value={specs.camera}
                    onChange={(e) => updateSpec('camera', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Camera trước</div>
                  <Form.Control type='text' placeholder='VD: 32MP' value={specs.cameraFront}
                    onChange={(e) => updateSpec('cameraFront', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Chip</div>
                  <Form.Control type='text' placeholder='VD: A19 Pro' value={specs.chip}
                    onChange={(e) => updateSpec('chip', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Hệ điều hành</div>
                  <Form.Control type='text' placeholder='VD: iOS 19' value={specs.os}
                    onChange={(e) => updateSpec('os', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>SIM</div>
                  <Form.Control type='text' placeholder='VD: 1 SIM + eSIM' value={specs.sim}
                    onChange={(e) => updateSpec('sim', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Kết nối</div>
                  <Form.Control type='text' placeholder='VD: 5G, WiFi 7' value={specs.connectivity}
                    onChange={(e) => updateSpec('connectivity', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
              </div>
            </Form.Group>

            {/* ── MỚI (B8): Flash Sale ── */}
            <Form.Group controlId='flashSale' style={{ marginTop: 20 }}>
              <Form.Label>
                <i className='fas fa-bolt me-2' style={{ color: '#ff6b6b' }}></i>
                Flash Sale <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: 12 }}>(không bắt buộc)</span>
              </Form.Label>
              <div style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, padding: 16 }}>
                <Form.Check
                  type='switch'
                  id='flashSaleActive'
                  label='Kích hoạt Flash Sale cho sản phẩm này'
                  checked={flashSale.isActive}
                  onChange={(e) => updateFlashSale('isActive', e.target.checked)}
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>% Giảm giá</div>
                    <Form.Control type='number' min={1} max={90} placeholder='VD: 20' value={flashSale.discountPercent}
                      onChange={(e) => updateFlashSale('discountPercent', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Bắt đầu</div>
                    <Form.Control type='datetime-local' value={flashSale.startsAt}
                      onChange={(e) => updateFlashSale('startsAt', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Kết thúc</div>
                    <Form.Control type='datetime-local' value={flashSale.endsAt}
                      onChange={(e) => updateFlashSale('endsAt', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ color: '#8a8fa3', fontSize: 11.5, marginTop: 10 }}>
                  <i className='fas fa-info-circle me-1'></i>
                  Giá sẽ tự động quay về giá gốc ngay khi hết thời gian kết thúc — không cần thao tác gì thêm.
                </div>
              </div>
            </Form.Group>

            <Button type='submit' variant='primary' style={{ marginTop: 20 }}>
              Cập Nhật
            </Button>

          </Form>
        )}
      </FormContainer>
    </>
  )
}

export default ProductEditScreen