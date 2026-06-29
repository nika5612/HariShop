import { withTimeout } from './utils.js'
import { formatEtaLabel } from './utils.js'
import ghnProvider from './providers/ghn.js'
import viettelPostProvider from './providers/viettelpost.js'
import Settings from '../../models/settingsModel.js'

const PROVIDERS = {
  ghn: ghnProvider,
  viettelpost: viettelPostProvider,
}

function computeTotalWeightGrams(cartItems) {
  // Current data shape: orderItems have `weight` (assume grams) on frontend seeding
  return cartItems.reduce((sum, item) => {
    const w = Number(item?.weight || 0)
    const q = Number(item?.qty || 0)
    return sum + w * q
  }, 0)
}

async function safeProviderQuotes(providerKey, provider, payload) {
  try {
    const result = await withTimeout(provider.getQuotes(payload), provider.timeoutMs || 5000)
    return (result || []).map((q) => ({
      ...q,
      carrier: providerKey,
      etaLabel: q.etaDate ? formatEtaLabel(q.etaDate) : q.etaLabel || null,
      available: q.available !== false,
    }))
  } catch (e) {
    return [
      {
        carrier: providerKey,
        available: false,
        reason: e?.message || 'Provider quote failed',
      },
    ]
  }
}

const ShippingService = {
  async getQuotes({ cartItems, toAddress }) {
    const totalWeightGrams = computeTotalWeightGrams(cartItems)

    const settings = await Settings.findOne({ key: 'global' }).lean().catch(() => null)
    const fromAddress = settings?.warehouseAddress || null

    const payload = {
      cartItems,
      toAddress,
      fromAddress,
      totalWeightGrams,
    }

    const providers = Object.entries(PROVIDERS)
    const results = await Promise.all(
      providers.map(([k, p]) => safeProviderQuotes(k, p, payload))
    )
    const quotes = results.flat()

    const availableQuotes = quotes.filter((q) => q.available)
    if (availableQuotes.length > 0) return availableQuotes

    // Fallback: safe default so checkout is not blocked
    const fallbackFee = Number(process.env.DEFAULT_SHIP_FEE || 30000)
    return [
      {
        carrier: 'fallback',
        serviceCode: 'fallback',
        serviceName: 'Phí vận chuyển tạm tính',
        fee: fallbackFee,
        etaDate: null,
        etaLabel: null,
        available: true,
        isFallback: true,
      },
    ]
  },

  async track({ carrier, trackingId }) {
    const provider = PROVIDERS[carrier]
    if (!provider) {
      return { available: false, carrier, trackingId, events: [], reason: 'Unsupported carrier' }
    }

    try {
      const result = await withTimeout(provider.track(trackingId), provider.timeoutMs || 5000)
      return {
        available: true,
        carrier,
        trackingId,
        events: result?.events || [],
        raw: result?.raw,
      }
    } catch (e) {
      return {
        available: false,
        carrier,
        trackingId,
        events: [],
        reason: e?.message || 'Tracking failed',
      }
    }
  },
}

export default ShippingService

