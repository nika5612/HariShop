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

  // ── SỬA BUG: tồn kho thủ công cho sản phẩm KHÔNG dùng biến thể màu ──
  const [manualStock, setManualStock] = useState(0)

  // ── MỚI: state thông số kỹ thuật (specs) - tất cả không bắt buộc ──
  const [specs, setSpecs] = useState({
    ram: '', storage: '', battery: '', screenSize: '', screenType: '',
    camera: '', chip: '', os: '', sim: '', connectivity: '',
  })
  const updateSpec = (field, value) => setSpecs((s) => ({ ...s, [field]: value }))

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
            chip:         product.specs.chip         || '',
            os:           product.specs.os           || '',
            sim:          product.specs.sim          || '',
            connectivity: product.specs.connectivity || '',
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

  // Tổng stock từ tất cả màu
  const totalStock = colors.reduce((sum, c) => sum + Number(c.countInStock), 0)

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
      { name: colorName.trim(), hexCode: colorHex, countInStock: Number(colorStock) },
    ])
    setColorName('')
    setColorHex('#888888')
    setColorStock(0)
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
        brand,
        category,
        description,
        weight,
        colors,
        specs,
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
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Camera</div>
                  <Form.Control type='text' placeholder='VD: 48MP + 12MP' value={specs.camera}
                    onChange={(e) => updateSpec('camera', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
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