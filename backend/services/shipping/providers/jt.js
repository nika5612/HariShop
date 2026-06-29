const JNT_TIMEOUT_MS = 5000;

function envTrim(key) {
  return (process.env[key] || '').trim();
}

async function getQuotes({ fromAddress, toAddress, totalWeightGrams }) {
  const apiKey = envTrim('JNT_API_KEY');
  const pickProvince = fromAddress.provinceCode;
  const pickDistrict = fromAddress.districtCode;
  const district = toAddress.districtCode;
  const ward = toAddress.wardCode;

  if (!apiKey || !pickProvince || !pickDistrict || !district || !ward) {
    return [{
      available: false,
      reason: 'Missing JNT_API_KEY or address codes',
    }];
  }

  // J&T VN quotes API not publicly documented; use estimated based on distance/weight
  // Placeholder for partner API integration
  try {
    // Mock response for demo (replace with real API when key provided)
    return [{
      carrier: 'jt',
      serviceCode: 'standard',
      serviceName: 'J&T Express Tiêu chuẩn',
      fee: Math.max(25000, totalWeightGrams / 1000 * 8000), // Example calc
      etaDays: 2,
      available: true,
    }];
  } catch (e) {
    return [{
      carrier: 'jt',
      available: false,
      reason: e.message,
    }];
  }
}

async function track(trackingId) {
  const apiKey = envTrim('JNT_API_KEY');
  if (!apiKey || !trackingId) {
    throw new Error('Missing JNT_API_KEY or trackingId');
  }

  try {
    const response = await fetch('https://v2-api.jtexpress.vn/Tracking/GetTrackInfoById', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        WayBillNumber: trackingId,
        JCompanyCode: 'JNTVN', // Vietnam
      }),
    });

    if (!response.ok) throw new Error(`J&T track: ${response.status}`);

    const data = await response.json();
    if (!data || !Array.isArray(data.TrackInfoList)) {
      return { events: [], raw: data };
    }

    return {
      events: data.TrackInfoList.map(item => ({
        status: item.ActionRemark || item.ActionLog,
        description: item.StationName || '',
        location: item.RouteName || '',
        time: item.AcceptTime || item.ActionTime,
      })).reverse(), // Latest first
      raw: data,
    };
  } catch (e) {
    console.error('J&T track error:', e);
    throw e;
  }
}

export default {
  timeoutMs: JNT_TIMEOUT_MS,
  getQuotes,
  track,
};
