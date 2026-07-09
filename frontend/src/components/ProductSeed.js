// Optional: keep your static product data in a separate file if you still need it.
// The UI should import the React component from ./Product (default export).

export const productSeed = [
  {
    name: 'iPhone 17 Pro Max 1TB',
    image: '/images/iphone17.jpg',
    description:
      'iPhone 17 Pro Max trang bị chip A19 Pro mạnh mẽ, RAM 12GB, bộ nhớ trong 1TB. Màn hình OLED 6.9 inch ProMotion, camera nâng cấp AI, pin dung lượng lớn.',
    brand: 'Apple',
    category: 'Điện thoại',
    price: 52990000,
    countInStock: 8,
    weight: 230,
    rating: 0,
    numReviews: 0,
    specs: {
      ram: '12GB',
      storage: '1TB',
      battery: 4685,
      screenSize: '6.9 inch',
      screenType: 'OLED 120Hz',
      camera: '48MP + 12MP + 12MP',
      chip: 'A19 Pro',
      os: 'iOS 19',
      sim: '1 SIM + eSIM',
      connectivity: '5G, WiFi 7, BT 5.3',
    },
  },
  {
    name: 'iPhone 16 Pro Max 512GB',
    image: '/images/iphone16.jpg',
    description:
      'iPhone 16 Pro Max sử dụng chip A18 Pro, RAM 8GB, bộ nhớ 512GB. Màn hình OLED 6.7 inch, camera tele cải tiến, pin bền bỉ cho cả ngày dài.',
    brand: 'Apple',
    category: 'Điện thoại',
    price: 39990000,
    countInStock: 10,
    weight: 227,
    rating: 0,
    numReviews: 0,
    specs: {
      ram: '8GB',
      storage: '512GB',
      battery: 4685,
      screenSize: '6.7 inch',
      screenType: 'OLED 120Hz',
      camera: '48MP + 12MP + 12MP',
      chip: 'A18 Pro',
      os: 'iOS 18',
      sim: '1 SIM + eSIM',
      connectivity: '5G, WiFi 6E, BT 5.3',
    },
  },
]

