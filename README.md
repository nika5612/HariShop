# 📱 HariShop — Website Bán Điện Thoại

Ứng dụng thương mại điện tử bán điện thoại xây dựng trên nền tảng **MERN Stack** (MongoDB, Express, React, Node.js).

> Đồ án môn học — Sinh viên: **Nguyễn Chí Hải** (MSSV: 19110513)  
> GVHD: **Trương Thị Ngọc Phượng** — Trường ĐH Sư Phạm Kỹ Thuật TP.HCM

---

## 🚀 Tính năng chính

### Người dùng (User)
- Đăng ký, đăng nhập bằng email/mật khẩu (mã hóa bcrypt)
- Quên mật khẩu và đặt lại qua email
- Tìm kiếm, lọc sản phẩm theo hãng và phân khúc giá
- Sắp xếp sản phẩm: mới nhất, giá tăng dần, giá giảm dần
- Xem chi tiết sản phẩm, đánh giá và nhận xét
- Thêm vào giỏ hàng, đặt hàng
- Thanh toán với nhiều phương thức
- Sổ địa chỉ giao hàng (thêm, xóa, đặt mặc định)
- Theo dõi trạng thái đơn hàng
- Quản lý thông tin tài khoản (Profile)

### Quản trị viên (Admin)
- Quản lý người dùng: xem, sửa, xóa, cấp/thu hồi quyền admin
- Quản lý sản phẩm: thêm, sửa, xóa, upload hình ảnh
- Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái
- Cài đặt kho hàng (Warehouse Settings)

### Tích hợp vận chuyển
- **GHN** (Giao Hàng Nhanh)
- **ViettelPost**
- **GHTK**
- **J&T Express**

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Database | MongoDB + Mongoose | 5.10.6 |
| Backend | Node.js + Express | 4.17.1 |
| Frontend | React + Redux | — |
| Xác thực | JSON Web Token (JWT) | 8.5.1 |
| Mã hóa | bcryptjs | 2.4.3 |
| Upload ảnh | Multer | 1.4.2 |
| Môi trường | dotenv / @dotenvx | ^1.39.0 |
| Dev tools | Nodemon, Concurrently, cross-env | — |

---

## 📁 Cấu trúc dự án

```
proshop/
├── backend/
│   ├── controllers/
│   │   ├── userController.js        # Xử lý auth, profile, địa chỉ
│   │   ├── productController.js     # CRUD sản phẩm, review
│   │   ├── orderController.js       # Đặt hàng, cập nhật trạng thái
│   │   ├── shippingController.js    # Lấy báo giá vận chuyển
│   │   └── settingsController.js    # Cài đặt kho hàng
│   ├── models/
│   │   ├── userModel.js
│   │   ├── productModel.js          # Bao gồm reviewSchema + index
│   │   ├── orderModel.js
│   │   └── settingsModel.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── shippingRoutes.js
│   │   ├── uploadRoutes.js
│   │   └── settingsRoutes.js
│   ├── services/
│   │   └── shipping/
│   │       ├── ShippingService.js   # Tổng hợp báo giá các hãng
│   │       ├── providers/
│   │       │   ├── ghn.js
│   │       │   ├── viettelpost.js
│   │       │   ├── ghtk.js
│   │       │   └── jt.js
│   │       └── locationMapping.js
│   ├── utils/
│   │   ├── generateToken.js         # Tạo JWT token (30 ngày)
│   │   ├── rateLimit.js             # Giới hạn request
│   │   └── test-mail.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── screens/                 # Các màn hình chính
│       │   ├── HomeScreen.js
│       │   ├── LoginScreen.js
│       │   ├── RegisterScreen.js
│       │   ├── ProductScreen.js
│       │   ├── CartScreen.js
│       │   ├── ShippingScreen.js
│       │   ├── PaymentScreen.js
│       │   ├── PlaceOrderScreen.js
│       │   ├── OrderScreen.js
│       │   ├── ProfileScreen.js
│       │   ├── AddressBookScreen.js
│       │   ├── TrackingScreen.js
│       │   ├── ForgotPasswordScreen.js
│       │   ├── ResetPasswordScreen.js
│       │   └── [Admin screens...]
│       ├── components/
│       │   ├── Header.js
│       │   ├── Footer.js
│       │   ├── Product.js
│       │   ├── ProductCarousel.js
│       │   ├── SearchBox.js
│       │   ├── Rating.js
│       │   ├── Paginate.js
│       │   ├── Loader.js
│       │   ├── Message.js
│       │   └── SortDropdown.js
│       ├── actions/                 # Redux action creators
│       ├── reducers/                # Redux reducers
│       ├── constants/               # Redux action types
│       └── App.js
├── package.json
└── .env
```

---

## ⚙️ Cài đặt và chạy dự án

### Yêu cầu
- Node.js >= 14
- MongoDB (local hoặc MongoDB Atlas)

### 1. Clone và cài đặt dependencies

```bash
# Cài đặt dependencies gốc (backend)
npm install

# Cài đặt dependencies frontend
npm install --prefix frontend
```

### 2. Tạo file `.env` ở thư mục gốc

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Tùy chọn - tích hợp vận chuyển
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_ghn_shop_id
VIETTELPOST_TOKEN=your_viettelpost_token
```

### 3. Nạp dữ liệu mẫu

```bash
# Import dữ liệu mẫu
npm run data:import

# Xóa toàn bộ dữ liệu
npm run data:destroy
```

### 4. Chạy ứng dụng

```bash
# Chạy cả backend và frontend cùng lúc (development)
npm start

# Chỉ chạy backend
npm run server

# Chỉ chạy frontend
npm run client
```

Ứng dụng sẽ chạy tại:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## 🔗 API Endpoints chính

### User
| Method | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| POST | `/api/users/login` | Đăng nhập | Public |
| POST | `/api/users` | Đăng ký | Public |
| POST | `/api/users/forgotpassword` | Gửi email reset mật khẩu | Public |
| PUT | `/api/users/resetpassword/:token` | Đặt lại mật khẩu | Public |
| GET | `/api/users/profile` | Lấy thông tin tài khoản | Private |
| PUT | `/api/users/profile` | Cập nhật thông tin | Private |
| GET/POST | `/api/users/addresses` | Quản lý địa chỉ | Private |
| GET | `/api/users` | Danh sách users | Admin |

### Product
| Method | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| GET | `/api/products` | Danh sách sản phẩm (hỗ trợ lọc, phân trang) | Public |
| GET | `/api/products/:id` | Chi tiết sản phẩm | Public |
| POST | `/api/products/:id/reviews` | Viết đánh giá | Private |
| POST | `/api/products` | Thêm sản phẩm | Admin |
| PUT | `/api/products/:id` | Sửa sản phẩm | Admin |
| DELETE | `/api/products/:id` | Xóa sản phẩm | Admin |

### Order
| Method | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| POST | `/api/orders` | Tạo đơn hàng | Private |
| GET | `/api/orders/myorders` | Đơn hàng của tôi | Private |
| GET | `/api/orders/:id` | Chi tiết đơn hàng | Private |
| PUT | `/api/orders/:id/pay` | Cập nhật thanh toán | Private |
| GET | `/api/orders` | Tất cả đơn hàng | Admin |
| PUT | `/api/orders/:id/deliver` | Cập nhật giao hàng | Admin |

---

## 🗄️ Cơ sở dữ liệu

### Collection `users`
```
_id, name, email, password (bcrypt), isAdmin, addresses[], createdAt, updatedAt
```

### Collection `products`
```
_id, user (ref), name, image, brand, category, description,
reviews[], rating, numReviews, price, countInStock, weight, createdAt, updatedAt
```

### Collection `orders`
```
_id, user (ref), orderItems[], shippingAddress{}, paymentMethod,
itemsPrice, taxPrice, shippingPrice, totalPrice,
isPaid, paidAt, isDelivered, deliveredAt, createdAt, updatedAt
```

---

## 👤 Tài khoản mẫu (sau khi chạy data:import)

| Loại | Email | Mật khẩu |
|---|---|---|
| Admin | admin@example.com | 123456 |
| User | john@example.com | 123456 |

---

## 📝 Tác giả

**Nguyễn Chí Hải** — MSSV: 19110513  
Trường Đại học Sư Phạm Kỹ Thuật TP. Hồ Chí Minh  
Khoa Công Nghệ Thông Tin — Học kỳ 1, Năm học 2025–2026