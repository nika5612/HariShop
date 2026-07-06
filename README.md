# 📱 HariShop — Website Bán Điện Thoại

Ứng dụng thương mại điện tử bán điện thoại xây dựng trên nền tảng **MERN Stack** (MongoDB, Express, React, Node.js), tích hợp vận chuyển thực tế qua **GHN API** và thanh toán tự động qua **SePay VietQR**.

> Tiểu luận chuyên ngành — Sinh viên: **Nguyễn Chí Hải** (MSSV: 19110513)  
> GVHD: **ThS. Trương Thị Ngọc Phượng** — Trường ĐH Sư Phạm Kỹ Thuật TP.HCM

---

## 🚀 Tính năng chính

### 👤 Khách hàng
- Đăng ký, đăng nhập, đăng xuất
- Quên mật khẩu — nhận link đặt lại qua email (token SHA-256, hạn 10 phút)
- Tìm kiếm sản phẩm full-text, lọc theo hãng / danh mục / khoảng giá
- Sắp xếp: mới nhất, giá tăng dần, giá giảm dần, đánh giá cao nhất
- Xem chi tiết sản phẩm: biến thể màu sắc, tồn kho theo màu, đánh giá & xếp hạng sao
- Giỏ hàng: thêm/xóa/cập nhật theo cặp (sản phẩm + màu), chọn thanh toán từng phần
- **Đặt hàng — CheckoutScreen tích hợp 5 bước trên một màn hình:**
  1. Chọn địa chỉ giao hàng (từ sổ địa chỉ hoặc nhập mới)
  2. Lấy báo giá vận chuyển GHN tự động (debounce 400ms)
  3. Nhập mã voucher giảm giá (nếu có)
  4. Chọn phương thức thanh toán: COD hoặc Chuyển khoản VietQR
  5. Xác nhận đặt hàng
- Thanh toán chuyển khoản: quét QR VietQR, SePay webhook tự động xác nhận
- Theo dõi đơn hàng: trạng thái, mã vận đơn GHN, URL tracking; tự động cập nhật mỗi 10 giây
- Yêu cầu hủy đơn hàng (chờ Admin duyệt)
- Sổ địa chỉ giao hàng: thêm, xóa, đặt mặc định, hỗ trợ đa địa chỉ
- Quản lý hồ sơ cá nhân: tên, email, mật khẩu, ảnh đại diện
- Đánh giá & nhận xét sản phẩm sau khi mua

### 🛠️ Quản trị viên (Admin)
- Quản lý sản phẩm: thêm, sửa, xóa; upload ảnh (Multer); quản lý biến thể màu và tồn kho theo màu
- Quản lý đơn hàng: xem danh sách, cập nhật trạng thái giao hàng, duyệt/từ chối yêu cầu hủy
- Quản lý người dùng: xem danh sách, cấp/thu hồi quyền Admin
- Quản lý voucher: tạo mã giảm giá (% hoặc số tiền cố định), giới hạn lượt dùng, thời gian hiệu lực
- Dashboard thống kê: doanh thu theo tháng, số đơn hàng, top sản phẩm bán chạy
- Cấu hình hệ thống: địa chỉ kho hàng (dùng cho GHN), thông tin shop

### 🔗 Tích hợp bên thứ ba
- **GHN API** — Resolve địa chỉ tỉnh/quận/phường, báo giá vận chuyển thực tế, tạo vận đơn sau khi đặt hàng, hủy vận đơn khi hủy đơn; fallback phí tạm tính nếu GHN lỗi
- **SePay VietQR** — Sinh mã `transferContent` duy nhất, build URL QR, nhận webhook xác nhận thanh toán tự động; xác thực chữ ký HMAC-SHA256
- **Nodemailer (SMTP)** — Gửi email đặt lại mật khẩu tự động

---

## 🛠️ Công nghệ sử dụng

### Backend
| Thư viện | Công dụng |
|---|---|
| Node.js + Express | Runtime server + REST API framework |
| MongoDB + Mongoose | Cơ sở dữ liệu NoSQL + ODM |
| jsonwebtoken | Xác thực JWT (token 30 ngày) |
| bcryptjs | Băm mật khẩu (salt 10 vòng) |
| Multer | Upload ảnh sản phẩm (multipart/form-data) |
| Nodemailer | Gửi email qua SMTP |
| dotenv | Quản lý biến môi trường |
| cors | Cho phép cross-origin request |
| nodemon | Tự động restart server khi dev |

### Frontend
| Thư viện | Công dụng |
|---|---|
| React.js | Xây dựng giao diện SPA |
| Redux + Redux Thunk | Quản lý state toàn cục |
| Axios | Gửi HTTP request đến API |
| React Bootstrap | Bộ component UI responsive |
| React Router | Điều hướng phía client |

### Dịch vụ bên thứ ba
| Dịch vụ | Công dụng |
|---|---|
| GHN API | Vận chuyển — báo giá, tạo vận đơn |
| SePay VietQR | Thanh toán — webhook tự động |
| MongoDB Atlas | Hosting cơ sở dữ liệu cloud |

---

## 📁 Cấu trúc dự án

```
HariShop/
├── backend/
│   ├── config/
│   │   ├── db.js                    # Kết nối MongoDB
│   │   └── emailConfig.js           # Cấu hình Nodemailer SMTP
│   ├── controllers/
│   │   ├── userController.js        # Auth, profile, địa chỉ, quên mật khẩu
│   │   ├── productController.js     # CRUD sản phẩm, review, biến thể màu
│   │   ├── orderController.js       # Đặt hàng, thanh toán, SePay webhook
│   │   ├── shippingController.js    # Báo giá GHN
│   │   ├── voucherController.js     # CRUD voucher, validate, apply
│   │   └── settingsController.js    # Cài đặt kho hàng
│   ├── middleware/
│   │   ├── authMiddleware.js        # Xác thực JWT, phân quyền Admin
│   │   └── errorMiddleware.js       # Xử lý lỗi tập trung
│   ├── models/
│   │   ├── userModel.js             # User + địa chỉ embedded
│   │   ├── productModel.js          # Product + biến thể màu + review + index
│   │   ├── orderModel.js            # Order + GHN tracking + SePay fields
│   │   ├── voucherModel.js          # Voucher + usageLimit atomic
│   │   └── settingsModel.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── shippingRoutes.js
│   │   ├── uploadRoutes.js
│   │   ├── voucherRoutes.js
│   │   ├── sepayWebhookRoutes.js    # Endpoint nhận webhook SePay
│   │   └── settingsRoutes.js
│   ├── services/
│   │   └── shipping/
│   │       ├── ShippingService.js   # Tổng hợp báo giá
│   │       ├── providers/
│   │       │   └── ghn.js           # GHN provider (resolve địa chỉ, báo giá, tạo vận đơn)
│   │       └── utils.js
│   ├── utils/
│   │   ├── generateToken.js         # Tạo JWT token
│   │   └── rateLimit.js             # Rate limiting (3 lần/giờ/IP)
│   ├── data/
│   │   ├── products.js              # Dữ liệu mẫu sản phẩm
│   │   ├── users.js                 # Dữ liệu mẫu tài khoản
│   │   └── vn-address-codes.json    # Mã địa chỉ Việt Nam
│   ├── seeder.js                    # Script import/xóa dữ liệu mẫu
│   └── server.js
├── frontend/
│   └── src/
│       ├── screens/
│       │   ├── HomeScreen.js
│       │   ├── LoginScreen.js
│       │   ├── RegisterScreen.js
│       │   ├── ForgotPasswordScreen.js
│       │   ├── ResetPasswordScreen.js
│       │   ├── ProductScreen.js
│       │   ├── CartScreen.js
│       │   ├── CheckoutScreen.js    # Màn hình đặt hàng tích hợp 5 bước
│       │   ├── OrderScreen.js       # Theo dõi đơn + polling SePay
│       │   ├── ProfileScreen.js
│       │   ├── AddressBookScreen.js
│       │   └── admin/
│       │       ├── ProductListScreen.js
│       │       ├── ProductEditScreen.js
│       │       ├── OrderListScreen.js
│       │       ├── UserListScreen.js
│       │       ├── VoucherListScreen.js
│       │       └── DashboardScreen.js
│       ├── components/
│       │   ├── Header.js
│       │   ├── Footer.js
│       │   ├── Product.js
│       │   ├── Rating.js
│       │   ├── Paginate.js
│       │   ├── Loader.js
│       │   ├── Message.js
│       │   └── ConfirmDeleteModal.js
│       ├── actions/
│       ├── reducers/
│       ├── constants/
│       └── App.js
├── uploads/                         # Ảnh upload từ Admin (Multer)
├── package.json
└── .env
```

---

## ⚙️ Cài đặt và chạy dự án

### Yêu cầu
- Node.js >= 14
- MongoDB (local hoặc MongoDB Atlas)
- Tài khoản GHN (lấy token tại [ghn.vn](https://ghn.vn))
- Tài khoản SePay (lấy token tại [sepay.vn](https://sepay.vn)) *(tuỳ chọn)*

### 1. Clone repository

```bash
git clone https://github.com/your-username/harishop.git
cd harishop
```

### 2. Cài đặt dependencies

```bash
# Cài dependencies backend (ở thư mục gốc)
npm install

# Cài dependencies frontend
npm install --prefix frontend
```

### 3. Tạo file `.env` ở thư mục gốc

```env
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# GHN Vận chuyển
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_ghn_shop_id
DEFAULT_SHIP_FEE=30000

# SePay Thanh toán (tuỳ chọn)
SEPAY_SECRET=your_sepay_secret

# Nodemailer Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

> **Lưu ý Gmail:** Bật 2FA → tạo App Password tại [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) và dùng thay cho `EMAIL_PASS`.

### 4. Import dữ liệu mẫu

```bash
# Import dữ liệu mẫu (sản phẩm + tài khoản)
npm run data:import

# Xóa toàn bộ dữ liệu
npm run data:destroy
```

### 5. Chạy ứng dụng

```bash
# Chạy cả backend lẫn frontend cùng lúc (khuyên dùng)
npm start

# Chỉ chạy backend (cổng 5000)
npm run server

# Chỉ chạy frontend (cổng 3000)
npm run client
```

Ứng dụng chạy tại:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## 🔗 API Endpoints

### Users `/api/users`
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/login` | Đăng nhập | Public |
| POST | `/` | Đăng ký | Public |
| POST | `/forgotpassword` | Gửi email reset mật khẩu | Public |
| PUT | `/resetpassword/:token` | Đặt lại mật khẩu | Public |
| GET | `/profile` | Xem thông tin tài khoản | Private |
| PUT | `/profile` | Cập nhật thông tin | Private |
| GET | `/addresses` | Danh sách địa chỉ | Private |
| POST | `/addresses` | Thêm địa chỉ | Private |
| DELETE | `/addresses/:id` | Xóa địa chỉ | Private |
| PUT | `/addresses/:id/default` | Đặt địa chỉ mặc định | Private |
| GET | `/` | Danh sách tất cả users | Admin |
| DELETE | `/:id` | Xóa user | Admin |
| PUT | `/:id` | Cập nhật quyền user | Admin |

### Products `/api/products`
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/` | Danh sách sản phẩm (lọc, phân trang) | Public |
| GET | `/:id` | Chi tiết sản phẩm | Public |
| POST | `/:id/reviews` | Viết đánh giá | Private |
| POST | `/` | Thêm sản phẩm | Admin |
| PUT | `/:id` | Sửa sản phẩm | Admin |
| DELETE | `/:id` | Xóa sản phẩm | Admin |

### Orders `/api/orders`
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/` | Tạo đơn hàng | Private |
| GET | `/myorders` | Đơn hàng của tôi | Private |
| GET | `/:id` | Chi tiết đơn hàng | Private |
| PUT | `/:id/cancel-request` | Yêu cầu hủy đơn | Private |
| GET | `/` | Tất cả đơn hàng | Admin |
| PUT | `/:id/deliver` | Cập nhật trạng thái giao hàng | Admin |
| PUT | `/:id/cancel` | Duyệt/từ chối hủy đơn | Admin |

### Vouchers `/api/vouchers`
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/apply` | Validate và áp dụng voucher | Private |
| GET | `/` | Danh sách voucher | Admin |
| POST | `/` | Tạo voucher | Admin |
| PUT | `/:id` | Sửa voucher | Admin |
| DELETE | `/:id` | Xóa voucher | Admin |

### Shipping & Payment
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/shipping/quotes` | Lấy báo giá GHN | Private |
| POST | `/api/payments/sepay-webhook` | Nhận webhook SePay | Public |
| POST | `/api/upload` | Upload ảnh sản phẩm | Admin |

---

## 🗄️ Cơ sở dữ liệu

### Collection `users`
```
_id, name, email, password (bcrypt), isAdmin,
addresses[{ name, phone, address, city, district, ward, isDefault }],
avatar, resetPasswordToken, resetPasswordExpire,
createdAt, updatedAt
```

### Collection `products`
```
_id, user (ref), name, image, brand, category, description,
colors[{ name, image, countInStock }],
reviews[{ user, name, rating, comment }],
rating, numReviews, price, weight,
createdAt, updatedAt
```

### Collection `orders`
```
_id, user (ref), orderItems[{ name, qty, image, price, color, product }],
shippingAddress{ name, phone, address, city, district, ward },
paymentMethod, itemsPrice, shippingPrice, totalPrice,
voucherCode, discountAmount,
isPaid, paidAt, paymentResult{},
isDelivered, deliveredAt, deliveryStatus,
isCancelled, cancelRequest, cancelReason,
transferContent,
ghnOrderCode, ghnTrackingUrl,
createdAt, updatedAt
```

### Collection `vouchers`
```
_id, code, type (percent|fixed), value, maxDiscount,
minOrder, usageLimit, usedCount,
isActive, startsAt, expiresAt,
createdAt, updatedAt
```

---

## 👤 Tài khoản mẫu

Sau khi chạy `npm run data:import`:

| Loại | Email | Mật khẩu |
|---|---|---|
| Admin | admin@example.com | 123456 |
| User | hai@example.com | 123456 |
| User | haine@example.com | 123456 |

---

## 📝 Tác giả

**Nguyễn Chí Hải** — MSSV: 19110513  
Trường Đại học Sư Phạm Kỹ Thuật TP. Hồ Chí Minh  
Khoa Công Nghệ Thông Tin — Học kỳ II, Năm học 2025–2026