const VTP_TIMEOUT_MS = 5000

function envTrim(key) {
  return (process.env[key] || '').trim()
}

async function getQuotes({ toAddress, totalWeightGrams }) {
  const username = envTrim('VTP_USERNAME')
  const password = envTrim('VTP_PASSWORD')

  if (!username || !password) {
    return [
      {
        available: false,
        reason: 'Missing VTP_USERNAME or VTP_PASSWORD',
      },
    ]
  }

  // Viettel Post also typically needs province/district/ward codes.
  if (!toAddress?.districtCode && !toAddress?.districtId) {
    return [
      {
        available: false,
        reason: 'Missing district mapping for Viettel Post (need districtCode/districtId)',
      },
    ]
  }

  // Placeholder for official API call. Requires auth token flow in many VTP APIs.
  return [
    {
      available: false,
      reason: 'Viettel Post adapter not fully configured (requires official district/ward code mapping + token flow).',
    },
  ]
}

async function track(trackingId) {
  const username = envTrim('VTP_USERNAME')
  const password = envTrim('VTP_PASSWORD')
  if (!username || !password) {
    throw new Error('Missing VTP_USERNAME or VTP_PASSWORD')
  }
  return { events: [], raw: null }
}

export default {
  timeoutMs: VTP_TIMEOUT_MS,
  getQuotes,
  track,
}

