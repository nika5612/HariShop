import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'

// @desc    Fetch all products (search + filter + sort + paginate)
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 10
  const page = Number(req.query.pageNumber) || 1
  if (isNaN(page) || page < 1) {
    res.status(400)
    throw new Error('Invalid page number')
  }

  const validSorts = ['priceAsc', 'priceDesc', 'latest']
  const sort = req.query.sort || 'latest'
  if (!validSorts.includes(sort)) {
    res.status(400)
    throw new Error('Invalid sort parameter')
  }

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined

  if (
    (minPrice !== undefined && isNaN(minPrice)) ||
    (maxPrice !== undefined && isNaN(maxPrice))
  ) {
    res.status(400)
    throw new Error('Invalid price filter values')
  }

  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: 'i' } }
    : {}

  const brandFilter = req.query.brand
    ? { brand: { $regex: `^${req.query.brand}$`, $options: 'i' } }
    : {}

  const priceFilter = {}
  if (minPrice !== undefined || maxPrice !== undefined) {
    priceFilter.price = {}
    if (minPrice !== undefined) priceFilter.price.$gte = minPrice
    if (maxPrice !== undefined) priceFilter.price.$lte = maxPrice
  }

  let sortOption = { createdAt: -1 }
  switch (sort) {
    case 'priceAsc':  sortOption = { price: 1 };  break
    case 'priceDesc': sortOption = { price: -1 }; break
    case 'latest':    sortOption = { createdAt: -1 }; break
  }

  const filter = { ...keyword, ...brandFilter, ...priceFilter }

  const [totalCount, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sortOption)
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean(),
  ])

  res.status(200).json({
    success: true,
    products: products || [],
    page,
    pages: Math.ceil(totalCount / pageSize) || 1,
    totalCount: totalCount || 0,
  })
})

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (product) {
    res.json(product)
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (product) {
    await product.remove()
    res.json({ message: 'Product removed' })
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

// ── MỚI: createProduct nhận thêm colors ────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const {
    name, price, weight, image, brand,
    category, description,
    colors,      // ← MỚI: mảng màu từ frontend
    countInStock // fallback nếu không có colors
  } = req.body

  const product = new Product({
    name:        name        || 'Sample name',
    price:       price       || 0,
    weight:      weight      || 0,
    user:        req.user._id,
    // Chuẩn hóa image: nếu frontend gửi '/uploads/...' thì giữ nguyên.
    // Nếu gửi lại là 'uploads/...' hoặc fileName thì tự thêm '/uploads/'.
    image:
      typeof image === 'string'
        ? image.startsWith('/uploads/')
          ? image
          : image.startsWith('uploads/')
            ? `/${image}`
            : image.startsWith('/')
              ? image
              : `/uploads/${image}`
        : '/images/sample.jpg',
    brand:       brand       || 'Sample brand',
    category:    category    || 'Sample category',
    numReviews:  0,
    description: description || 'Sample description',
    // Nếu có colors thì lưu vào, countInStock sẽ tự tính bởi pre('save')
    // Nếu không có colors thì dùng countInStock truyền lên
    colors:       Array.isArray(colors) && colors.length > 0 ? colors : [],
    countInStock: Array.isArray(colors) && colors.length > 0 ? 0 : (countInStock || 0),
  })

  const createdProduct = await product.save()
  res.status(201).json(createdProduct)
})

// ── MỚI: updateProduct nhận thêm colors ────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name, price, weight, description,
    image, brand, category,
    colors,      // ← MỚI
    countInStock // fallback
  } = req.body

  const product = await Product.findById(req.params.id)

  if (product) {
    product.name        = name
    product.price       = price
    product.weight      = weight
    product.description = description
    // Chuẩn hóa lại image cho update
    product.image =
      typeof image === 'string'
        ? image.startsWith('/uploads/')
          ? image
          : image.startsWith('uploads/')
            ? `/${image}`
            : image.startsWith('/')
              ? image
              : `/uploads/${image}`
        : product.image
    product.brand       = brand
    product.category    = category

    // Cập nhật colors: nếu frontend gửi mảng colors thì dùng
    // countInStock sẽ tự tính lại bởi pre('save')
    if (Array.isArray(colors) && colors.length > 0) {
      product.colors = colors
      // countInStock sẽ được tính tự động bởi pre('save')
    } else {
      // Không có colors → dùng countInStock nhập tay
      product.colors       = []
      product.countInStock = countInStock
    }

    const updatedProduct = await product.save()
    res.json(updatedProduct)
  } else {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
})

const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body
  const product = await Product.findById(req.params.id)

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    )
    if (alreadyReviewed) {
      res.status(400)
      throw new Error('Sản Phẩm Đã Được Đánh Giá')
    }

    const review = {
      name:    req.user.name,
      rating:  Number(rating),
      comment,
      user:    req.user._id,
    }

    product.reviews.push(review)
    product.numReviews = product.reviews.length
    product.rating =
      product.reviews.reduce((acc, item) => acc + item.rating, 0) /
      product.reviews.length

    await product.save()
    res.status(201).json({ message: 'Review added' })
  } else {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
})

const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ rating: -1 }).limit(3).lean()
  res.status(200).json(products || [])
})

const deleteProductReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }

  product.reviews = product.reviews.filter(
    (r) => r._id.toString() !== req.params.reviewId
  )
  product.numReviews = product.reviews.length
  product.rating =
    product.reviews.length > 0
      ? product.reviews.reduce((acc, item) => acc + item.rating, 0) /
        product.reviews.length
      : 0

  await product.save()
  res.json({ message: 'Đã xóa đánh giá' })
})

export {
  getProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
  deleteProductReview,
}