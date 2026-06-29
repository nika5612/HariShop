import stringSimilarity from 'string-similarity'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Force override process.env with the latest .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true })

function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^(tỉnh|thành phố|thành phó|tp\.|quận|huyện|thị xã|phường|xã|thị trấn)\s+/i, '')
    .trim();
}

export async function getMergedProvinces() {
  // Lấy dữ liệu token mới nhất vừa tải
  const token = (process.env.GHN_TOKEN || '').trim();
  
  const [ghnRes, vtpRes] = await Promise.all([
    fetch('https://online-gateway.ghn.vn/shiip/public-api/master-data/province', { headers: { Token: token } }).then(r => r.json()).catch(() => ({ data: [] })),
    fetch('https://partner.viettelpost.vn/v2/categories/listProvinceById?provinceId=-1').then(r => r.json()).catch(() => ({ data: [] }))
  ]);

  const ghnList = Array.isArray(ghnRes?.data) ? ghnRes.data : [];
  const vtpList = Array.isArray(vtpRes?.data) ? vtpRes.data : [];

  return ghnList.map(ghn => {
    const normName = normalizeName(ghn.ProvinceName);
    // Find best match in VTP
    let matchVtp = null;
    let bestMatch = null;
    
    if (vtpList.length > 0) {
      const vtpNames = vtpList.map(v => normalizeName(v.PROVINCE_NAME));
      bestMatch = stringSimilarity.findBestMatch(normName, vtpNames).bestMatch;
      if (bestMatch.rating > 0.8) {
        matchVtp = vtpList.find(v => normalizeName(v.PROVINCE_NAME) === bestMatch.target);
      }
    }

    return {
      provinceName: ghn.ProvinceName,
      ghnProvinceId: ghn.ProvinceID,
      vtpProvinceId: matchVtp ? matchVtp.PROVINCE_ID : null,
    };
  }).sort((a,b) => a.provinceName.localeCompare(b.provinceName));
}


export async function getMergedDistricts(provinceMap) {
  // provinceMap should be { ghnProvinceId, vtpProvinceId }
  const payload = typeof provinceMap === 'string' ? JSON.parse(provinceMap) : provinceMap;
  const token = (process.env.GHN_TOKEN || '').trim();
  
  const [ghnRes, vtpRes] = await Promise.all([
    fetch('https://online-gateway.ghn.vn/shiip/public-api/master-data/district', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Token: token },
      body: JSON.stringify({ province_id: Number(payload.ghnProvinceId) })
    }).then(r => r.json()).catch(() => ({ data: [] })),
    
    payload.vtpProvinceId 
      ? fetch(`https://partner.viettelpost.vn/v2/categories/listDistrict?provinceId=${payload.vtpProvinceId}`).then(r => r.json()).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] })
  ]);

  const ghnList = Array.isArray(ghnRes?.data) ? ghnRes.data : [];
  const vtpList = Array.isArray(vtpRes?.data) ? vtpRes.data : [];

  return ghnList.map(ghn => {
    const normName = normalizeName(ghn.DistrictName);
    let matchVtp = null;
    let bestMatch = null;

    if (vtpList.length > 0) {
      const vtpNames = vtpList.map(v => normalizeName(v.DISTRICT_NAME));
      bestMatch = stringSimilarity.findBestMatch(normName, vtpNames).bestMatch;
      if (bestMatch.rating > 0.8) {
        matchVtp = vtpList.find(v => normalizeName(v.DISTRICT_NAME) === bestMatch.target);
      }
    }

    return {
      districtName: ghn.DistrictName,
      ghnDistrictId: ghn.DistrictID,
      vtpDistrictId: matchVtp ? matchVtp.DISTRICT_ID : null,
    }
  }).sort((a,b) => a.districtName.localeCompare(b.districtName));
}


export async function getMergedWards(districtMap) {
  const payload = typeof districtMap === 'string' ? JSON.parse(districtMap) : districtMap;
  const token = (process.env.GHN_TOKEN || '').trim();
  
  const [ghnRes, vtpRes] = await Promise.all([
    fetch(`https://online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${payload.ghnDistrictId}`, { 
      headers: { Token: token }
    }).then(r => r.json()).catch(() => ({ data: [] })),
    
    payload.vtpDistrictId 
      ? fetch(`https://partner.viettelpost.vn/v2/categories/listWards?districtId=${payload.vtpDistrictId}`).then(r => r.json()).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] })
  ]);

  const ghnList = Array.isArray(ghnRes?.data) ? ghnRes.data : [];
  const vtpList = Array.isArray(vtpRes?.data) ? vtpRes.data : [];

  return ghnList.map(ghn => {
    const normName = normalizeName(ghn.WardName);
    let matchVtp = null;
    let bestMatch = null;

    if (vtpList.length > 0) {
      const vtpNames = vtpList.map(v => normalizeName(v.WARDS_NAME));
      if (vtpNames.length > 0) {
        bestMatch = stringSimilarity.findBestMatch(normName, vtpNames).bestMatch;
        if (bestMatch.rating > 0.7) { // Lower threshold for wards 
          matchVtp = vtpList.find(v => normalizeName(v.WARDS_NAME) === bestMatch.target);
        }
      }
    }

    return {
      wardName: ghn.WardName,
      ghnWardCode: ghn.WardCode,
      vtpWardId: matchVtp ? matchVtp.WARDS_ID : null,
    }
  }).sort((a,b) => a.wardName.localeCompare(b.wardName));
}
