const GHTK_TIMEOUT_MS = 5000;

function envTrim(key) {
  return (process.env[key] || '').trim();
}

async function getQuotes({ fromAddress, toAddress, totalWeightGrams }) {
  const token = envTrim('GHTK_TOKEN') || '0339959893'; // Provided account
  const pickProvince = fromAddress.provinceCode;
  const pickDistrict = fromAddress.districtCode;
  const district = toAddress.districtCode;
  const ward = toAddress.wardCode;

  if (!token || !pickProvince || !pickDistrict || !district || !ward) {
    return [{
      available: false,
      reason: 'Missing GHTK_TOKEN or address codes (province/district/ward)',
    }];
  }

  try {
    const response = await fetch('https://services.ghtkl.vn/services/shipment/fee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Token': token },
      body: JSON.stringify({
        pick_province: pickProvince,
        pick_district: pickDistrict,
        district_id: Number(district),
        ward_code: ward,
        weight: Math.ceil(totalWeightGrams / 1000), // kg
        // insurance_value: 0, quantity: 1 (simplified)
      }),
    });

    if (!response.ok) throw new Error(`GHTK fee API: ${response.status}`);

    const data = await response.json();
    if (!data.success || !data.data || !data.data.services) {
      throw new Error('Invalid GHTK response');
    }

    return data.data.services.map(s => ({
      carrier: 'ghtk',
      serviceCode: s.service_id,
      serviceName: s.service_name || s.name,
      fee: Number(s.cost || s.fee || 0),
      etaDays: s.delivery_time || 2,
      etaDate: null, // Calc from current + etaDays
      available: true,
    }));

  } catch (e) {
    console.error('GHTK quotes error:', e);
    return [{
      carrier: 'ghtk',
      available: false,
      reason: e.message,
    }];
  }
}

async function track(trackingId) {
  const token = envTrim('GHTK_TOKEN') || '0339959893';
  if (!token || !trackingId) {
    throw new Error('Missing GHTK_TOKEN or trackingId');
  }

  try {
    const response = await fetch(`https://services.ghtkl.vn/services/shipment/track?token=${token}&tracking_id=${trackingId}`);
    if (!response.ok) throw new Error(`GHTK track: ${response.status}`);

    const data = await response.json();
    if (!data.success || !data.data || !data.data.tracking_history) {
      return { events: [], raw: data };
    }

    return {
      events: data.data.tracking_history.map(h => ({
        status: h.status_name,
        description: h.pick_province_name + ' -> ' + h.deliver_province_name,
        location: h.current_status,
        time: h.current_time,
      })),
      raw: data,
    };
  } catch (e) {
    console.error('GHTK track error:', e);
    throw e;
  }
}

export default {
  timeoutMs: GHTK_TIMEOUT_MS,
  getQuotes,
  track,
};

