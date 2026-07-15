import express from 'express'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = express.Router()

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'harishop',            // tất cả ảnh gom vào 1 thư mục trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
    // Giới hạn kích thước tối đa 1200x1200, giữ tỉ lệ, không phóng to ảnh nhỏ hơn
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    // Tên file ngẫu nhiên để tránh trùng, giữ nguyên logic cũ (fieldname + timestamp)
    public_id: (req, file) => {
      const base = file.fieldname || 'image'
      return `${base}-${Date.now()}`
    },
  },
})

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/
  const extnameOk = filetypes.test(file.originalname.toLowerCase())
  const mimetypeOk = filetypes.test(file.mimetype)

  if (extnameOk && mimetypeOk) {
    return cb(null, true)
  } else {
    cb(new Error('Images only!'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB/ảnh
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb)
  },
})

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Không có file ảnh nào được tải lên.')
  }

  res.send(req.file.path)
})

export default router