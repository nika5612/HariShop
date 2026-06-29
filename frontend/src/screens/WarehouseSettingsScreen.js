import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'

const WarehouseSettingsScreen = ({ history }) => {
  const { userInfo } = useSelector((state) => state.userLogin)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  const [detail, setDetail] = useState('')
  const [ghnDistrictId, setGhnDistrictId] = useState('')
  const [ghnWardCode, setGhnWardCode] = useState('')

  useEffect(() => {
    if (!userInfo || !userInfo.isAdmin) {
      history.push('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } }
        const { data } = await axios.get('/api/settings/warehouse', config)
        const w = data?.warehouseAddress || {}
        setFullName(w.fullName || '')
        setPhone(w.phone || '')
        setProvince(w.province || '')
        setDistrict(w.district || '')
        setWard(w.ward || '')
        setDetail(w.detail || '')
        setGhnDistrictId(w.ghnDistrictId ? String(w.ghnDistrictId) : '')
        setGhnWardCode(w.ghnWardCode || '')
      } catch (e) {
        setError(e?.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [history, userInfo])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
      }
      const payload = {
        warehouseAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          province: province.trim(),
          district: district.trim(),
          ward: ward.trim(),
          detail: detail.trim(),
          ghnDistrictId: Number(ghnDistrictId || 0),
          ghnWardCode: ghnWardCode.trim(),
        },
      }
      await axios.put('/api/settings/warehouse', payload, config)
      setSuccess('Đã lưu địa chỉ kho.')
    } catch (e2) {
      setError(e2?.response?.data?.message || e2.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: 0 }}>
          <i className='fas fa-warehouse me-2' style={{ color: '#33FFCC' }}></i>
          Cấu hình kho gửi hàng
        </h2>
        <div style={{ color: '#b8bcc8', fontSize: '13px', marginTop: '6px' }}>
          Địa chỉ kho sẽ được dùng làm địa chỉ gửi hàng khi gọi API hãng vận chuyển.
        </div>
      </div>

      {loading && <Loader />}
      {error && <Message variant='danger'>{error}</Message>}
      {success && <Message variant='success'>{success}</Message>}

      <form onSubmit={submit} style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        border: '1px solid rgba(51,255,204,0.15)',
        padding: '18px 20px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <Field label='Tên người gửi' value={fullName} onChange={setFullName} />
          <Field label='Số điện thoại' value={phone} onChange={setPhone} />
          <Field label='Tỉnh/Thành phố' value={province} onChange={setProvince} />
          <Field label='Quận/Huyện' value={district} onChange={setDistrict} />
          <Field label='Phường/Xã' value={ward} onChange={setWard} />
          <Field label='Số nhà, tên đường' value={detail} onChange={setDetail} />
          <Field label='GHN District ID (tự động nếu có)' value={ghnDistrictId} onChange={setGhnDistrictId} />
          <Field label='GHN Ward Code (tự động nếu có)' value={ghnWardCode} onChange={setGhnWardCode} />
        </div>

        <button type='submit' disabled={saving} style={{
          marginTop: '16px',
          background: '#33FFCC',
          border: 'none',
          color: '#0f0f23',
          borderRadius: '12px',
          padding: '12px 18px',
          fontWeight: '700',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </form>
    </div>
  )
}

const Field = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ color: '#b8bcc8', fontSize: '13px' }}>{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: '#0f0f23',
      border: '1px solid rgba(51,255,204,0.25)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '12px 12px',
      outline: 'none',
    }} />
  </label>
)

export default WarehouseSettingsScreen

