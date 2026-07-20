// Cấu hình Jest cho ES modules (project dùng "type": "module") — không cần
// babel, dùng thẳng hỗ trợ ESM gốc của Node qua cờ --experimental-vm-modules
// (đã khai trong script "test" ở package.json).
export default {
  testEnvironment: 'node',
  transform: {},
  // Không ràng buộc tên thư mục cụ thể (__tests__ hay tests đều được) — chỉ
  // cần file kết thúc bằng .test.js nằm trong backend/ là Jest tìm thấy.
  testMatch: ['**/backend/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
}