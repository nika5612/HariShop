import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import { callAI } from '../utils/aiProvider.js'
import { attachFlashSale, attachFlashSaleToList, normalizeFlashSale } from '../utils/flashSale.js'

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

  // ── MỚI: sort theo cột kiểu FC Online (click header ở trang quản lý
  // sản phẩm). Whitelist field để tránh client truyền field tuỳ ý vào
  // .sort() (NoSQL injection / lỗi lạ khi field không tồn tại).
  const SORTABLE_PRODUCT_FIELDS = {
    name: 'name',
    price: 'price',
    category: 'category',
    brand: 'brand',
    countInStock: 'countInStock',
    rating: 'rating',
    createdAt: 'createdAt',
  }
  const requestedSortBy = req.query.sortBy
  const requestedOrder = req.query.order === 'asc' ? 1 : req.query.order === 'desc' ? -1 : null
  const columnSortField = SORTABLE_PRODUCT_FIELDS[requestedSortBy]
  const hasColumnSort = Boolean(columnSortField) && requestedOrder !== null

  const now = new Date()
  const aggregateSort = hasColumnSort
    ? { [columnSortField]: requestedOrder }
    : {
        isCurrentlyOnSale: -1, // 1 = đang sale → lên đầu, 0 = không sale → xuống dưới
        ...sortOption,
      }

  const [totalCount, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: filter },
      {
        $addFields: {
          isCurrentlyOnSale: {
            $cond: [
              {
                $and: [
                  { $eq: ['$flashSale.isActive', true] },
                  { $gt: ['$flashSale.discountPercent', 0] },
                  { $lte: ['$flashSale.startsAt', now] },
                  { $gte: ['$flashSale.endsAt', now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      { $sort: aggregateSort },
      { $skip: pageSize * (page - 1) },
      { $limit: pageSize },
    ]),
  ])

  res.status(200).json({
    success: true,
    products: attachFlashSaleToList(products),
    page,
    pages: Math.ceil(totalCount / pageSize) || 1,
    totalCount: totalCount || 0,
  })
})

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (product) {
    res.json(attachFlashSale(product.toObject()))
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (product) {
    await product.deleteOne()
    res.json({ message: 'Product removed' })
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('brand category price').lean()
  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  const candidates = await Product.find({
    _id: { $ne: product._id },
    $or: [{ brand: product.brand }, { category: product.category }],
  }).lean()

  const scored = candidates.map((p) => {
    let score = 0
    if (p.brand === product.brand) score += 2
    if (p.category === product.category) score += 2
    const priceDiffRatio = product.price > 0 ? Math.abs(p.price - product.price) / product.price : 1
    if (priceDiffRatio <= 0.3) score += 2
    else if (priceDiffRatio <= 0.6) score += 1
    return { product: p, score }
  })

  const similar = scored
    .sort((a, b) => b.score - a.score || (b.product.rating || 0) - (a.product.rating || 0))
    .slice(0, 8)
    .map((s) => s.product)

  const frequentlyBoughtRaw = await Order.aggregate([
    { $match: { isCancelled: { $ne: true }, 'orderItems.product': product._id } },
    { $unwind: '$orderItems' },
    { $match: { 'orderItems.product': { $ne: product._id } } },
    { $group: { _id: '$orderItems.product', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ])

  const frequentlyBoughtIds = frequentlyBoughtRaw.map((r) => r._id)
  const frequentlyBoughtProductsRaw = frequentlyBoughtIds.length > 0
    ? await Product.find({ _id: { $in: frequentlyBoughtIds } }).lean()
    : []

  // Giữ đúng thứ tự xếp hạng theo tần suất mua cùng
  const frequentlyBoughtTogether = frequentlyBoughtIds
    .map((id) => frequentlyBoughtProductsRaw.find((p) => p._id.toString() === id.toString()))
    .filter(Boolean)

  res.json({
    similar: attachFlashSaleToList(similar),
    frequentlyBoughtTogether: attachFlashSaleToList(frequentlyBoughtTogether),
  })
})

const getPersonalizedProducts = asyncHandler(async (req, res) => {
  const userOrders = await Order.find({ user: req.user._id, isCancelled: { $ne: true } })
    .select('orderItems.product')
    .lean()

  const purchasedProductIds = new Set()
  userOrders.forEach((o) => (o.orderItems || []).forEach((item) => {
    if (item.product) purchasedProductIds.add(item.product.toString())
  }))

  if (purchasedProductIds.size === 0) {
    return res.json({ products: [] })
  }

  const purchasedProducts = await Product.find({ _id: { $in: [...purchasedProductIds] } })
    .select('brand category')
    .lean()

  const brandCount = {}
  const categoryCount = {}
  purchasedProducts.forEach((p) => {
    if (p.brand) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1
    if (p.category) categoryCount[p.category] = (categoryCount[p.category] || 0) + 1
  })

  const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b)
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)

  if (topBrands.length === 0 && topCategories.length === 0) {
    return res.json({ products: [] })
  }

  const recommendations = await Product.find({
    _id: { $nin: [...purchasedProductIds] },
    $or: [
      ...(topBrands.length > 0 ? [{ brand: { $in: topBrands } }] : []),
      ...(topCategories.length > 0 ? [{ category: { $in: topCategories } }] : []),
    ],
  })
    .sort({ rating: -1 })
    .limit(10)
    .lean()

  res.json({ products: recommendations })
})

// ═══════════════════ B5: Tóm tắt & phân tích đánh giá bằng AI ═══════════════════

const MIN_REVIEWS_FOR_SUMMARY = 3 // cần ít nhất 3 đánh giá mới đủ dữ liệu để AI tổng hợp
const MAX_SAMPLE_PER_RATING = 12  // tối đa 12 đánh giá / mỗi mức sao (1-5⭐) đưa vào mẫu cho AI

const selectRepresentativeSample = (reviews) => {
  const byRating = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  reviews.forEach((r) => {
    const bucket = byRating[Math.round(r.rating)]
    if (bucket) bucket.push(r)
  })

  const sample = []
  Object.values(byRating).forEach((bucket) => {
    // Ưu tiên bình luận dài/chi tiết hơn (thường mang nhiều thông tin hữu ích hơn "tốt", "ok")
    bucket.sort((a, b) => (b.comment?.length || 0) - (a.comment?.length || 0))
    sample.push(...bucket.slice(0, MAX_SAMPLE_PER_RATING))
  })

  return sample
}

const buildReviewSummaryPrompt = (productName, reviewsText, isSampled, totalReviewCount, sampleSize) => `
Bạn là bộ máy tổng hợp đánh giá sản phẩm cho website bán điện thoại HariShop.
Dưới đây là ${isSampled
    ? `một MẪU ĐẠI DIỆN gồm ${sampleSize} đánh giá (được chọn lọc cân bằng theo từng mức sao) trong tổng số ${totalReviewCount} đánh giá THẬT`
    : `toàn bộ ${sampleSize} đánh giá THẬT`
  } của khách hàng về sản phẩm "${productName}". Hãy đọc và tổng hợp
thành 1 object JSON DUY NHẤT, KHÔNG kèm giải thích, KHÔNG dùng markdown/code fence (không có \`\`\`),
đúng cấu trúc sau:

{
  "summary": string,
  "pros": [ { "text": string, "mentions": number } ],
  "cons": [ { "text": string, "mentions": number } ]
}

Giải thích:
- "summary": 1-2 câu tổng quan ngắn gọn về cảm nhận chung của khách hàng.
- "pros": tối đa 4 ưu điểm nổi bật nhất được nhiều khách nhắc đến.
- "cons": tối đa 3 hạn chế nổi bật nhất (mảng RỖNG [] nếu không có hạn chế đáng kể nào).
- "text" mỗi mục ngắn gọn (dưới 12 từ), tiếng Việt, nêu đúng 1 ý cụ thể
  (vd "Pin trâu, dùng cả ngày không lo hết pin", "Camera chụp đêm chưa nét").
- "mentions": SỐ LƯỢNG đánh giá (đếm thật trong danh sách bên dưới, KHÔNG suy rộng ra tổng số
  ${totalReviewCount} đánh giá) có nhắc đến ý đó — không bịa số.
- CHỈ tổng hợp từ nội dung đánh giá thật bên dưới, tuyệt đối không suy diễn thêm điều khách không nói.
- Sắp xếp "pros" và "cons" theo "mentions" giảm dần.

DANH SÁCH ĐÁNH GIÁ (kèm số sao, đánh số thứ tự):
${reviewsText}
`.trim()

// @desc    Lấy bản tóm tắt đánh giá do AI tạo (có cache, chỉ tạo lại khi có review mới)
// @route   GET /api/products/:id/review-summary
// @access  Public
const getReviewSummary = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('name reviews aiReviewSummary')
  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  const reviewCount = product.reviews.length

  if (reviewCount < MIN_REVIEWS_FOR_SUMMARY) {
    return res.json({
      available: false,
      reason: 'not_enough_reviews',
      minRequired: MIN_REVIEWS_FOR_SUMMARY,
      currentCount: reviewCount,
    })
  }

  // ── Dùng cache nếu chưa có đánh giá mới nào kể từ lần tổng hợp trước ──
  if (product.aiReviewSummary?.generatedAt && product.aiReviewSummary.reviewCountAtGeneration === reviewCount) {
    return res.json({
      available: true,
      summary: product.aiReviewSummary.summary,
      pros: product.aiReviewSummary.pros,
      cons: product.aiReviewSummary.cons,
      isSampled: product.aiReviewSummary.isSampled,
      sampleSize: product.aiReviewSummary.sampleSize,
      reviewCount,
      cached: true,
    })
  }

  const sampledReviews = selectRepresentativeSample(product.reviews)
  const isSampled = sampledReviews.length < reviewCount

  const reviewsText = sampledReviews
    .map((r, i) => `${i + 1}. [${r.rating}/5 sao] ${r.comment}`)
    .join('\n')

  const systemPrompt = buildReviewSummaryPrompt(product.name, reviewsText, isSampled, reviewCount, sampledReviews.length)

  const callAndParse = async () => {
    const text = await callAI(
      systemPrompt,
      [{ role: 'user', content: 'Hãy tổng hợp các đánh giá trên thành JSON theo đúng cấu trúc đã yêu cầu.' }],
      { maxTokens: 1000, checkLeak: false }
    )
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) // ném lỗi nếu không parse được
  }

  // Tóm tắt đánh giá là tác vụ "nặng" nhất (đầu ra dài hơn B3), nên cho phép thử lại
  // nhiều lần hơn (tối đa 3 lần) trước khi báo lỗi cho khách.
  const MAX_ATTEMPTS = 3
  let parsed
  let lastErr
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      parsed = await callAndParse()
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      if (err.statusCode && err.statusCode !== 502) break // lỗi cấu hình/rate-limit hẳn — dừng sớm, không cố thêm
      console.warn(`⚠️ Tóm tắt đánh giá thất bại (lần ${attempt}/${MAX_ATTEMPTS}), ${attempt < MAX_ATTEMPTS ? 'đang thử lại...' : 'dừng lại.'}`)
    }
  }

  if (lastErr) {
    if (lastErr.statusCode) {
      res.status(lastErr.statusCode)
      throw lastErr
    }
    console.error('❌ Không tổng hợp được đánh giá sau khi thử lại (B5):', lastErr.message)
    res.status(502)
    throw new Error('AI không tổng hợp được đánh giá lúc này, vui lòng thử lại sau.')
  }

  const pros = Array.isArray(parsed.pros)
    ? parsed.pros
        .filter((p) => p && p.text)
        .slice(0, 4)
        .map((p) => ({ text: String(p.text).slice(0, 150), mentions: Number(p.mentions) || 0 }))
    : []

  const cons = Array.isArray(parsed.cons)
    ? parsed.cons
        .filter((c) => c && c.text)
        .slice(0, 3)
        .map((c) => ({ text: String(c.text).slice(0, 150), mentions: Number(c.mentions) || 0 }))
    : []

  const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : ''

  product.aiReviewSummary = {
    summary,
    pros,
    cons,
    reviewCountAtGeneration: reviewCount,
    isSampled,
    sampleSize: sampledReviews.length,
    generatedAt: new Date(),
  }
  await product.save()

  res.json({ available: true, summary, pros, cons, isSampled, sampleSize: sampledReviews.length, reviewCount, cached: false })
})

// ── MỚI: chuẩn hóa specs từ req.body - mọi trường đều optional ──
const normalizeSpecs = (specs) => {
  if (!specs || typeof specs !== 'object') return {}
  return {
    ram:          specs.ram          ? String(specs.ram).trim()          : '',
    storage:      specs.storage      ? String(specs.storage).trim()      : '',
    battery:      specs.battery      ? Number(specs.battery) || 0        : 0,
    screenSize:   specs.screenSize   ? String(specs.screenSize).trim()   : '',
    screenType:   specs.screenType   ? String(specs.screenType).trim()   : '',
    camera:       specs.camera       ? String(specs.camera).trim()       : '',
    cameraFront:  specs.cameraFront  ? String(specs.cameraFront).trim()  : '',
    chip:         specs.chip         ? String(specs.chip).trim()         : '',
    os:           specs.os           ? String(specs.os).trim()           : '',
    sim:          specs.sim          ? String(specs.sim).trim()          : '',
    connectivity: specs.connectivity ? String(specs.connectivity).trim() : '',
  }
}

// ── MỚI: createProduct nhận thêm colors ────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const {
    name, price, weight, image, brand,
    category, description,
    colors,      // ← MỚI: mảng màu từ frontend
    specs,       // ← MỚI: thông số kỹ thuật
    flashSale,   // ← MỚI (B8): flash sale
    countInStock // fallback nếu không có colors
  } = req.body

  const product = new Product({
    name:        name        || 'Sample name',
    price:       price       || 0,
    weight:      weight      || 0,
    user:        req.user._id,
    // Chuẩn hóa image: nếu frontend gửi '/uploads/...' thì giữ nguyên.
    // Nếu gửi lại là 'uploads/...' hoặc fileName thì tự thêm '/uploads/'.
    // MỚI (B10): nếu là link Cloudinary/URL đầy đủ (http:// hoặc https://) thì
    // giữ nguyên, KHÔNG được ghép thêm '/uploads/' vào trước.
    image:
      typeof image === 'string'
        ? /^https?:\/\//i.test(image)
          ? image
          : image.startsWith('/uploads/')
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
    // ── MỚI: thông số kỹ thuật ──────────────────────────────────
    specs: normalizeSpecs(specs),
    // ── MỚI (B8): Flash Sale ────────────────────────────────────
    flashSale: normalizeFlashSale(flashSale),
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
    specs,       // ← MỚI: thông số kỹ thuật
    flashSale,   // ← MỚI (B8): flash sale
    countInStock // fallback
  } = req.body

  const product = await Product.findById(req.params.id)

  if (product) {
    product.name        = name
    product.price       = price
    product.weight      = weight
    product.description = description
    // Chuẩn hóa lại image cho update
    // MỚI (B10): nếu là link Cloudinary/URL đầy đủ (http:// hoặc https://) thì
    // giữ nguyên, KHÔNG được ghép thêm '/uploads/' vào trước.
    product.image =
      typeof image === 'string'
        ? /^https?:\/\//i.test(image)
          ? image
          : image.startsWith('/uploads/')
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

    // ── MỚI: cập nhật thông số kỹ thuật ─────────────────────────
    product.specs = normalizeSpecs(specs)

    // ── MỚI (B8): cập nhật Flash Sale ────────────────────────────
    product.flashSale = normalizeFlashSale(flashSale)

    const updatedProduct = await product.save()

    res.json(attachFlashSale(updatedProduct.toObject()))
  } else {
    res.status(404)
    throw new Error('Không tìm thấy sản phẩm')
  }
})

const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body
  const product = await Product.findById(req.params.id)

  if (product) {
    // MỚI: chỉ khách đã MUA và NHẬN HÀNG THÀNH CÔNG sản phẩm này mới được đánh giá
    const hasPurchased = await Order.exists({
      user: req.user._id,
      'orderItems.product': product._id,
      $or: [{ status: 'delivered' }, { isDelivered: true }],
    })

    if (!hasPurchased) {
      res.status(403)
      throw new Error('Bạn cần mua và nhận hàng thành công sản phẩm này trước khi có thể đánh giá.')
    }

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
  res.status(200).json(attachFlashSaleToList(products))
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
  getRelatedProducts,
  getPersonalizedProducts,
  getReviewSummary,
}