import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Carousel } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Loader from './Loader'
import Message from './Message'
import { listTopProducts } from '../actions/productActions'

const formatVnd = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString('vi-VN')
}

const getCloudinaryBannerUrl = (url, width, height) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url
  }
  const transform = `f_auto,q_auto,c_fill,g_auto,dpr_auto,w_${width},h_${height}`
  return url.replace('/upload/', `/upload/${transform}/`)
}

const ProductCarousel = () => {
  const dispatch = useDispatch()

  const productTopRated = useSelector((state) => state.productTopRated)
  const { loading, error, products } = productTopRated

  useEffect(() => {
    dispatch(listTopProducts())
  }, [dispatch])

  if (loading) return <Loader />
  if (error) return <Message variant='danger'>{error}</Message>
  if (!products || products.length === 0) return null

  return (
    <Carousel pause='hover' className='hero-carousel' interval={4500}>
      {products.map((product) => {
        // MỚI: ưu tiên bannerImage (ảnh ngang riêng cho carousel) nếu Admin đã
        // upload; nếu không có thì fallback dùng lại ảnh sản phẩm như trước.
        const rawImage = product.bannerImage || product.image
        const bannerSrc = getCloudinaryBannerUrl(rawImage, 1600, 640)
        const { isFlashSaleActive, discountPercent, salePrice, price } = product

        return (
          <Carousel.Item key={product._id}>
            <Link to={`/product/${product._id}`} className='hero-carousel-slide'>
              <img
                className='hero-carousel-img'
                src={bannerSrc}
                alt={product.name}
                loading='lazy'
              />
              <div className='hero-carousel-overlay' />

              {isFlashSaleActive && (
                <div className='hero-carousel-badge'>
                  Giảm {discountPercent}%
                </div>
              )}

              <Carousel.Caption className='hero-carousel-caption'>
                <h2>{product.name}</h2>

                {typeof price !== 'undefined' && (
                  <div className='hero-carousel-price'>
                    {isFlashSaleActive ? (
                      <>
                        <span className='hero-carousel-price-sale'>{formatVnd(salePrice)}đ</span>
                        <span className='hero-carousel-price-old'>{formatVnd(price)}đ</span>
                      </>
                    ) : (
                      <span className='hero-carousel-price-sale'>{formatVnd(price)}đ</span>
                    )}
                  </div>
                )}

                <span className='hero-carousel-cta'>Xem ngay</span>
              </Carousel.Caption>
            </Link>
          </Carousel.Item>
        )
      })}
    </Carousel>
  )
}

export default ProductCarousel