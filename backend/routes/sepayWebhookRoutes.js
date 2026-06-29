import express from 'express'
import asyncHandler from 'express-async-handler'
import crypto from 'crypto'
import Order from '../models/orderModel.js'

const router = express.Router()

function getSepaySecret() {
  const v = (process.env.SEPAY_SECRET || '').trim()
  return v
}

function verifySepaySignature({ rawBody, headers, query, secret }) {
  // NOTE: sePay signature header name depends on their docs.
  // Since user provided only endpoint + secret key, we support common patterns:
  // - x-sepay-signature
  // - x-signature
  // - x-hmac-signature
  // Signature verification algorithm is assumed HMAC-SHA256.

  const signature =
    headers['x-sepay-signature'] ||
    headers['x-signature'] ||
    headers['x-hmac-signature'] ||
    headers['X-Sepay-Signature'] ||
    headers['X-Signature'] ||
    headers['X-Hmac-Signature']

  if (!signature) return false

  const normalizedSecret = String(secret)
  const hmac = crypto.createHmac('sha256', normalizedSecret)
  // Many providers sign request body as-is.
  hmac.update(rawBody || '')
  const expected = hmac.digest('hex')

  return expected === String(signature)
}

// Webhook endpoint for sePay
// POST /api/payments/sepay-webhook
router.post(
  '/sepay-webhook',
  asyncHandler(async (req, res) => {
    const secret = getSepaySecret()
    if (!secret) {
      return res.status(500).json({ ok: false, message: 'SEPAY_SECRET missing' })
    }

    // express.json() already consumed body; we don't have raw body here by default.
    // We'll still attempt to verify using JSON string from req.body.
    // If your sePay requires exact raw bytes, adjust server to use express.raw.
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})

    const ok = verifySepaySignature({
      rawBody,
      headers: req.headers,
      query: req.query,
      secret,
    })

    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid sePay signature' })
    }

    const payload = req.body || {}

    // Map orderId: depends on sePay payload fields
    const orderId =
      payload.orderId ||
      payload.order_id ||
      payload.merchantOrderId ||
      payload.merchant_order_id ||
      payload.reference ||
      payload.order_reference

    if (!orderId) {
      return res.status(400).json({ ok: false, message: 'Missing order reference in webhook payload' })
    }

    const status = payload.status || payload.transactionStatus || payload.paymentStatus
    const transactionId = payload.transactionId || payload.transaction_id || payload.id

    const updated = await Order.findById(orderId)
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Order not found for reference' })
    }

    const paid = String(status || '').toLowerCase() === 'success' || String(status || '').toLowerCase() === 'paid'

    if (!paid) {
      // keep order unpaid; still store result for auditing
      updated.paymentResult = {
        id: transactionId || '',
        status: String(status || ''),
        update_time: payload.update_time || payload.datetime || new Date().toISOString(),
        email_address: payload.payer?.email || payload.email_address || '',
      }
      await updated.save()
      return res.json({ ok: true, message: 'Payment not successful - order left unpaid' })
    }

    // Idempotent update
    if (!updated.isPaid) {
      updated.isPaid = true
      updated.paidAt = Date.now()
    }

    updated.paymentResult = {
      id: transactionId || '',
      status: String(status || 'success'),
      update_time: payload.update_time || payload.datetime || new Date().toISOString(),
      email_address: payload.payer?.email || payload.email_address || '',
    }

    await updated.save()

    return res.json({ ok: true, message: 'Order marked as paid' })
  })
)

export default router

