# TODO

- [x] Xác định nguyên nhân crash React `HomeScreen` (do render component sai kiểu).
- [x] Kiểm tra các component liên quan (`Paginate`, `ProductCarousel`, `Message`, `Loader`, `Meta`).
- [x] Kiểm tra `frontend/src/components/Product.js` và phát hiện export sai (default export là array).
- [ ] Sửa `frontend/src/components/Product.js` để export đúng: default phải là React component.
- [x] Xử lý lỗi cú pháp còn lại trong `Product.js` (do edit trước đó làm file bị hỏng).

- [ ] Chạy lại build/frontend để xác nhận hết lỗi React.
- [ ] Tiếp tục kiểm tra lỗi phụ: `undefined is not valid JSON`, `process is not defined`.

