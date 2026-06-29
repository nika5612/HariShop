import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';
import { getMergedProvinces, getMergedDistricts, getMergedWards } from '../services/shipping/locationMapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const normalize = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^(tỉnh|thành phố|thành phó|tp\.|quận|huyện|thị xã|phường|xã|thị trấn)\s+/i, '')
    .trim();
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    console.log('MongoDB Connected!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const migrateData = async () => {
  await connectDB();
  console.log('🔄 Đang lấy danh sách danh mục Tỉnh/Thành từ GHN & ViettelPost...');
  const provinces = await getMergedProvinces();
  console.log(`✅ Lấy thành công ${provinces.length} Tỉnh/Thành`);

  // Migrate User Addresses
  const users = await User.find({});
  let userSuccess = 0;
  let userFailed = 0;

  for (const user of users) {
    let changed = false;
    for (let addr of user.addresses) {
      if (!addr.ghnDistrictId) {
        // Missing mapping
        const pNorm = normalize(addr.province);
        const dNorm = normalize(addr.district || addr.detail); // fallback if district is in detail
        const wNorm = normalize(addr.ward);

        const provinceMatch = provinces.find(p => normalize(p.provinceName) === pNorm);
        if (provinceMatch) {
          const districts = await getMergedDistricts(provinceMatch);
          const districtMatch = districts.find(d => normalize(d.districtName) === dNorm);
          
          if (districtMatch) {
            const wards = await getMergedWards(districtMatch);
            // Fuzzy search happens inside locationMapping for wards
            const wardMatch = wards.find(w => normalize(w.wardName) === wNorm);

            if (wardMatch) {
              addr.ghnDistrictId = districtMatch.ghnDistrictId;
              addr.ghnWardCode = wardMatch.ghnWardCode;
              addr.vtpProvinceId = provinceMatch.vtpProvinceId;
              addr.vtpDistrictId = districtMatch.vtpDistrictId;
              addr.vtpWardId = wardMatch.vtpWardId;
              
              addr.provinceName = provinceMatch.provinceName;
              addr.districtName = districtMatch.districtName;
              addr.wardName = wardMatch.wardName;
              changed = true;
              userSuccess++;
              continue;
            }
          }
        }
        userFailed++;
        console.log(`⚠️ Không map được Address của User ${user.email} - [${addr.province}, ${addr.district}, ${addr.ward}]`);
      }
    }
    if (changed) {
      await user.save();
    }
  }

  console.log(`🎉 Migrate User: ${userSuccess} thành công, ${userFailed} thất bại`);

  // We could do the same for Orders but orders are snapshots, let's leave past orders as is unless specified
  process.exit();
};

migrateData();
