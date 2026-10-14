# CN10 – Thành viên và điểm tích lũy (Vinh)


## Quy tắc điểm được chốt

Tài liệu phân công CN10 không quy định tỷ lệ quy đổi cụ thể, vì vậy implementation tập trung hóa hai hằng số để dễ thay đổi:

- `10.000 VND` thanh toán = `1 điểm`.
- `1 điểm` = `1.000 VND` giảm khi đổi điểm.
- Điểm được tính trên `final_amount` sau các giảm giá cấp đơn.
- Với đơn có voucher, voucher được tính trước, sau đó mới áp điểm.
- Số điểm dùng không vượt số dư khách hàng và không vượt số điểm cần để đưa số tiền phải trả về 0.
- Đơn chưa thanh toán không được tích điểm.
- Khi đơn bị từ chối/hủy trước thanh toán, điểm đã đổi được hoàn lại đúng một lần.
- Điểm không được âm.

## API backend

### `GET /api/v1/members/me`

Customer xem hồ sơ thành viên và số điểm của chính mình.

### `GET /api/v1/members/search?q=...&page=1&limit=20`

Employee/Admin tra khách. `q` khớp `membership_code`, `email`, `phone`, `full_name`.

### `GET /api/v1/members/:customerId`

Customer chỉ được xem chính mình; Employee/Admin được xem khách hàng.

### `GET /api/v1/members/:customerId/points/history?page=1&limit=20`

Lịch sử `earn`, `redeem`, `release`.

## Tích/đổi điểm theo transaction

### Online

`checkout` tính tổng → voucher → preview điểm → tạo order → ghi giao dịch redeem điểm → tạo order items/payment → commit. Payment online vẫn `pending`, vì vậy chưa có giao dịch `earn`.

Khi `payCash` xác nhận payment `paid`, service gọi `earnForPaidOrder` trong chính transaction. Retry của endpoint vẫn gọi service nhưng khóa logic bằng `UNIQUE(order_id, type)` + kiểm tra transaction trước/sau khi khóa khách.

### POS

POS nhận `customer_id` và `points_used`, giữ `sale_requests` làm idempotency của toàn bộ sale. Trong cùng transaction: khóa sản phẩm → tính tiền → tạo order → redeem điểm → tạo payment `paid` → earn điểm → hoàn tất sale request. Retry cùng key chỉ replay order, không chạy lại nghiệp vụ điểm.

## Database

`loyalty_transactions` đã tồn tại trong schema gốc nên CN10 tái sử dụng bảng đó, không tạo bảng lịch sử thứ hai.

Migration `database/18_cn10_loyalty.sql`:

- siết `users.points` thành `NOT NULL DEFAULT 0`;
- thêm `CHECK(points >= 0)`;
- thêm `CHECK(points_change <> 0)`;
- thêm `UNIQUE(order_id, type)` để chống xử lý earn/redeem/release trùng trên một order;
- thêm index lịch sử theo `user_id, created_at, loyalty_id`;
- cấp `membership_code` ổn định cho customer cũ còn thiếu mã.

## Các file chính

- `backend/src/repositories/loyalty.repository.js`
- `backend/src/services/loyalty.service.js`
- `backend/src/controllers/loyalty.controller.js`
- `backend/src/routes/loyalty.routes.js`
- `database/18_cn10_loyalty.sql`
- `database/19_cn10_verification.sql`
- `backend/test/cn10-loyalty.service.test.js`

Luồng thanh toán callback tương lai nên gọi lại `loyaltyService.earnForPaidOrder(...)` bằng chính DB connection của transaction callback; không tự viết logic cộng điểm thứ hai.
