# Buổi 5 — Vinh V2/V3

## 1. Kiến trúc / hợp đồng tích hợp
- Route → Controller → Service → Repository → MySQL.
- Controller chỉ xử lý HTTP; Service xử lý validation + nghiệp vụ; Repository chỉ SQL tham số hóa.
- Repository hỗ trợ `executor` để dùng đúng một connection trong transaction.
- Transaction manager có begin / commit / rollback / release.
- Có tài liệu chốt chữ ký hàm và ranh giới transaction.

## 2. Auth thật
- Register / Login / Logout / Me.
- JWT HS256 có `userId` + `jti`.
- `user_sessions` lưu và kiểm tra phiên trên server.
- Không còn demo JWT secret mặc định.
- `req.auth = { userId, role }`; middleware lấy role từ DB.
- Mật khẩu dùng bcryptjs; `package.json` đã khai báo `bcryptjs` 3.0.3.

## 3. Dữ liệu / fixture
- Migration chuẩn hóa `password_hash` và tạo `user_sessions`.
- Fixture có: tồn kho/tồn kệ tách biệt, sản phẩm tồn thấp, sản phẩm hết hàng, voucher hợp lệ/hết hạn/hết lượt, đơn pending/shipping/completed/rejected, cart test.
- Có file SQL kiểm tra dữ liệu sau seed.
- Có test rollback riêng, chỉ chạy trên DB test.

## 4. Index + đo
- Index được chọn theo truy vấn thực tế: products, inventory_logs, orders theo customer, orders theo status.
- Có EXPLAIN SQL riêng.
- Có script đo warm-up + 31 lần chạy và lấy median/P50.
- Script lưu kết quả thật vào `docs/buoi5-index-measurement.latest.json` sau khi chạy với MySQL.

## 6. CRUD chính
- Categories: list / detail / create / update / delete.
- Products: list / detail / create / update / soft-delete.
- Inventory items: list / detail / create / update / soft-delete; logs; import/export/adjust.
- Users: list / detail / create / update / soft-delete (admin).
- Vouchers: list / detail / create / update / soft-delete; validate.
- Có validation ở Service, SQL dùng tham số, API write có phân quyền.

## Kiểm tra local
- `node --check` cho toàn bộ JS trong `src` và `test`: PASS.
- Chưa chạy `npm test` / `npm run check` vì gói dependency chưa được cài và môi trường này không có MySQL test server.
- Chưa ghi số P50 giả; nhóm cần chạy benchmark trên MySQL test thật.
