import express from 'express'
const router = express.Router()

import {
  getProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
  deleteProductReview,
  getRelatedProducts,
  getPersonalizedProducts,
  getReviewSummary,
} from '../controllers/productController.js'
import { naturalLanguageSearch } from '../controllers/searchController.js'

import { protect, admin } from '../middleware/authMiddleware.js'

router.route('/').get(getProducts).post(protect, admin, createProduct)
router.get('/top', getTopProducts)
// MỚI (B3): tìm kiếm bằng ngôn ngữ tự nhiên — đặt trước '/:id' để tránh xung đột route
router.post('/nl-search', naturalLanguageSearch)
// MỚI (B4): gợi ý cá nhân hoá theo lịch sử mua hàng — đặt trước '/:id' để tránh xung đột route
router.get('/personalized', protect, getPersonalizedProducts)

router.route('/:id/reviews').post(protect, createProductReview)
router.route('/:id/reviews/:reviewId').delete(protect, admin, deleteProductReview)
// MỚI (B4): sản phẩm tương tự + sản phẩm thường mua cùng
router.get('/:id/related', getRelatedProducts)
// MỚI (B5): tóm tắt & phân tích đánh giá bằng AI
router.get('/:id/review-summary', getReviewSummary)

router
  .route('/:id')
  .get(getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct)

export default router