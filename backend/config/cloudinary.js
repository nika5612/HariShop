import { v2 as cloudinary } from 'cloudinary'

export function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  // 🔍 DEBUG TẠM THỜI — xoá console.log này sau khi xác nhận chạy đúng.
  console.log('🔍 [Cloudinary config check]', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '❌ THIẾU',
    api_key: process.env.CLOUDINARY_API_KEY
      ? process.env.CLOUDINARY_API_KEY.slice(0, 4) + '***'
      : '❌ THIẾU',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ có' : '❌ THIẾU',
  })
}

export default cloudinary