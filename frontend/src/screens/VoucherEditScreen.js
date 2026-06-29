import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Form, Button } from 'react-bootstrap'
import Message from '../components/Message'
import { useHistory, useParams } from 'react-router-dom'

import Loader from '../components/Loader'
import { createVoucher, updateVoucher, listVouchers } from '../actions/voucherAdminActions'
import { VOUCHER_CREATE_RESET, VOUCHER_UPDATE_RESET } from '../constants/voucherConstants'


const toInputDateTime = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  // yyyy-MM-ddTHH:mm for datetime-local (keeps local time)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const VoucherEditScreen = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { id } = useParams()


  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const voucherList = useSelector((state) => state.voucherList)
  const { vouchers } = voucherList

  const voucherCreate = useSelector((state) => state.voucherCreate)
  const { loading: loadingCreate, error: errorCreate, success: successCreate } = voucherCreate

  const voucherUpdate = useSelector((state) => state.voucherUpdate)
  const { loading: loadingUpdate, error: errorUpdate, success: successUpdate } = voucherUpdate

  const isEdit = Boolean(id)

  const initialForm = useMemo(() => {
    return {
      code: '',
      type: 'percent',
      value: 0,
      minOrder: 0,
      maxDiscount: 0,
      usageLimit: 0,
      startsAt: '',
      expiresAt: '',
      isActive: true,
    }
  }, [])

  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (!userInfo?.isAdmin) {
      history.push('/login')
      return
    }

    if (!isEdit) return

    if (!vouchers || vouchers.length === 0) {
      dispatch(listVouchers())
    }
  }, [dispatch, history, isEdit, userInfo?.isAdmin, vouchers])


  useEffect(() => {
    if (!isEdit) return
    const v = (vouchers || []).find((x) => x?._id === id || String(x?._id) === String(id))
    if (!v) return

    setForm({
      code: v.code || '',
      type: v.type || 'percent',
      value: Number(v.value || 0),
      minOrder: Number(v.minOrder || 0),
      maxDiscount: Number(v.maxDiscount || 0),
      usageLimit: Number(v.usageLimit || 0),
      startsAt: v.startsAt ? toInputDateTime(v.startsAt) : '',
      expiresAt: v.expiresAt ? toInputDateTime(v.expiresAt) : '',
      isActive: Boolean(v.isActive),
    })
  }, [id, isEdit, vouchers])

  useEffect(() => {
    if (successCreate || successUpdate) {
      dispatch({ type: VOUCHER_CREATE_RESET })
      dispatch({ type: VOUCHER_UPDATE_RESET })
      history.push('/admin/voucherlist')
    }
  }, [dispatch, history, successCreate, successUpdate])



  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }


  const onSubmit = (e) => {
    e.preventDefault()

    const payload = {
      code: String(form.code || '').trim().toUpperCase(),
      type: form.type,
      value: Number(form.value || 0),
      minOrder: Number(form.minOrder || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      usageLimit: Number(form.usageLimit || 0),
      startsAt: form.startsAt ? new Date(form.startsAt) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      isActive: Boolean(form.isActive),
    }

    // Basic client-side checks
    if (!payload.code) return alert('code bắt buộc')
    if (!['percent', 'fixed'].includes(payload.type)) return alert('type phải là percent hoặc fixed')
    if (!payload.expiresAt || isNaN(payload.expiresAt.getTime())) return alert('expiresAt không hợp lệ')
    if (payload.value < 0) return alert('value không hợp lệ')
    if (payload.minOrder < 0) return alert('minOrder không hợp lệ')

    if (isEdit) dispatch(updateVoucher(id, payload))
    else dispatch(createVoucher(payload))
  }

  // Guard: tránh crash nếu import component bị undefined (theo console lỗi Element type invalid)
  const SafeLoader = Loader || (() => null)
  const SafeMessage = Message || (() => null)

  return (
    <>
      <h1>{isEdit ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h1>

      {/* Styling đồng bộ với ProductList/UserList: input text, placeholder, label color */}
      <style>
        {`
          /* Inputs */
          .voucher-edit-screen input,
          .voucher-edit-screen select,
          .voucher-edit-screen textarea {
            color: var(--hs-text) !important;
            background-color: rgba(26, 26, 46, 0.75) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }
          .voucher-edit-screen input::placeholder,
          .voucher-edit-screen textarea::placeholder {
            color: rgba(238, 240, 247, 0.55) !important;
          }

          /* Labels */
          .voucher-edit-screen label {
            color: var(--hs-text) !important;
            font-weight: 600;
          }

          /* Select dropdown text */
          .voucher-edit-screen select {
            color: var(--hs-text) !important;
          }
        `}
      </style>



      {loadingCreate || loadingUpdate ? <SafeLoader /> : null}

      {errorCreate ? <SafeMessage variant='danger'>{errorCreate}</SafeMessage> : null}
      {errorUpdate ? <SafeMessage variant='danger'>{errorUpdate}</SafeMessage> : null}

      <Form onSubmit={onSubmit} className='voucher-edit-screen'>

        <Form.Group className='mb-3'>
          <Form.Label>Mã voucher</Form.Label>
          <Form.Control name='code' value={form.code} onChange={onChange} placeholder='VD: HARI10' />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Loại</Form.Label>
          <Form.Control as='select' name='type' value={form.type} onChange={onChange}>
            <option value='percent'>percent (%)</option>
            <option value='fixed'>fixed (VNĐ)</option>
          </Form.Control>
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Giá trị (value)</Form.Label>
          <Form.Control type='number' name='value' value={form.value} onChange={onChange} />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Đơn tối thiểu (minOrder)</Form.Label>
          <Form.Control type='number' name='minOrder' value={form.minOrder} onChange={onChange} />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Max giảm (maxDiscount)</Form.Label>
          <Form.Control type='number' name='maxDiscount' value={form.maxDiscount} onChange={onChange} />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Giới hạn lượt (usageLimit) - 0 = không giới hạn</Form.Label>
          <Form.Control type='number' name='usageLimit' value={form.usageLimit} onChange={onChange} />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Ngày bắt đầu (startsAt)</Form.Label>
          <Form.Control type='datetime-local' name='startsAt' value={form.startsAt} onChange={onChange} />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label>Ngày hết hạn (expiresAt)</Form.Label>
          <Form.Control type='datetime-local' name='expiresAt' value={form.expiresAt} onChange={onChange} required />
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Check
            type='checkbox'
            label='Voucher đang hoạt động'
            name='isActive'
            checked={form.isActive}
            onChange={onChange}
          />
        </Form.Group>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant='primary' type='submit'>
            {isEdit ? 'Lưu' : 'Tạo'}
          </Button>
          <Button variant='secondary' type='button' onClick={() => history.push('/admin/voucherlist')}>

            Quay lại
          </Button>
        </div>
      </Form>
    </>
  )
}

export default VoucherEditScreen



