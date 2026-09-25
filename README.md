# WebNC-1-1-26-N03-

## Bảng phiên bản chuẩn của nhóm
| Thành viên | Hệ điều hành | Trình soạn thảo | Công cụ nền tảng |
| :--- | :--- | :--- | :--- |
| Trần Hữu Kiên | Windows 11 | VS Code |

## Khung backend ba tầng

Đề tài: Hệ thống quản lý vận hành siêu thị. Phần V1 dựng khung Node.js + Express + MySQL để nhóm phát triển theo tiến trình thực hành. Nhánh `Linh/v1/buoi4` chứa phần kiến trúc và quy tắc code của Buổi 4.

### Quy tắc làm việc chung

Đọc [Quy tắc code của nhóm](CONTRIBUTING.md) trước khi thêm module: tài liệu chốt ranh giới ba tầng, tên file/biến, URL `/api/v1`, HTTP method/status, JSON, lỗi, SQL, bảo mật, Git và review.

Trong `backend`, chạy `npm run format` để định dạng và `npm run check` trước khi push. Lệnh kiểm tra gồm ESLint, Prettier và test; GitHub Actions chạy lại trên mỗi push/pull request. Quy tắc bảo mật/nghiệp vụ trong tài liệu được áp dụng khi phát triển các phần tiếp theo.

### Chạy dự án

Yêu cầu Node.js 22.13+ (nhánh 22) hoặc Node.js 24 trở lên và MySQL với lược đồ Buổi 3. CI dùng Node.js 22; nhóm nên dùng cùng phiên bản nhánh 22 khi phát triển. Chạy trong thư mục `backend`:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Điền thông tin kết nối database trong .env
npm run dev
```

Trên Linux/macOS dùng `cp .env.example .env`. Chạy ổn định bằng `npm start`; chạy kiểm thử bằng `npm test`. Không đưa `.env` hoặc mật khẩu lên Git.

API gốc: `http://localhost:3000/api/v1`.

- `GET /health`: kiểm tra HTTP server đang hoạt động; không kiểm tra kết nối CSDL.
- `GET /products?page=1&limit=20`: đọc sản phẩm đang hoạt động qua đủ ba tầng. Mặc định và tối đa 20 bản ghi/trang; trang là số nguyên dương, tối đa 1.000.000. Sắp xếp theo `product_id`.

API sản phẩm cần bảng `products` của SQL Buổi 3 với các cột `product_id`, `product_name`, `barcode`, `price`, `unit`, `stock`, `category_id`, `image_url`, `status`; lọc `status = 'active'`. Nhóm nhập lược đồ và seed Buổi 3 trước khi gọi API này. Backend không tự tạo hoặc xóa database khi khởi động. Nếu chưa kết nối được CSDL, API sản phẩm trả lỗi 500 theo định dạng chung.

### Cấu trúc thư mục

```text
backend/
  src/
    config/          Cấu hình môi trường và pool MySQL
    routes/          Ánh xạ URL và HTTP method đến controller
    controllers/     Tầng trình diễn HTTP
    services/        Tầng nghiệp vụ
    repositories/    Tầng truy cập dữ liệu
    middlewares/     Xử lý xuyên suốt các yêu cầu
    errors/          Kiểu lỗi nghiệp vụ dùng chung
    app.js           Ghép middleware, routes và các tầng
    server.js        Khởi động HTTP server và đóng kết nối
  test/              Kiểm thử bằng node:test
  .env.example       Mẫu cấu hình không chứa bí mật
```

Một request sản phẩm đi theo thứ tự: route → `product.controller.js` → `product.service.js` → `product.repository.js` → MySQL. Response đi ngược lại.

| Thành phần | Trách nhiệm | Quy tắc |
| --- | --- | --- |
| Controller | Nhận tham số từ HTTP, gọi service, trả JSON | Không viết SQL hoặc xử lý quy tắc nghiệp vụ |
| Service | Kiểm tra dữ liệu, quy tắc nghiệp vụ, quyền sở hữu và điều phối giao dịch khi bổ sung nghiệp vụ | Không phụ thuộc `req`, `res` hoặc Express |
| Repository | Truy vấn và ánh xạ dữ liệu | Dùng tham số hóa; không quyết định mã HTTP |
| Middleware | Trace ID, CORS, đọc JSON và xử lý lỗi chung | Phần xác thực/phân quyền sẽ được bổ sung tại đây |

Các factory nhận dependency qua tham số để có thể kiểm thử mà không sửa code kết nối CSDL. Express 5 tự chuyển lỗi Promise từ controller tới middleware lỗi. Thêm API mới theo cấu trúc mẫu; không truy vấn database trực tiếp trong route.

### Định dạng phản hồi

Xem [Hướng dẫn xử lý lỗi tập trung và chụp minh chứng](docs/xu-ly-loi-tap-trung.md). `backend/requests/errors.http` chứa request mẫu lỗi 400, 404 và 415. Log cấu trúc ghi thông tin chẩn đoán tối thiểu, không ghi nguyên lỗi SQL hay dữ liệu nhạy cảm.

Thành công:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tham số phân trang không hợp lệ",
    "details": [{ "field": "limit", "issue": "Phải là số nguyên từ 1 đến 20" }],
    "traceId": "UUID do server tạo",
    "timestamp": "2026-09-25T00:00:00.000Z",
    "path": "/api/v1/products"
  }
}
```

Service có thể ném `AppError(status, code, message, details)` cho lỗi dự kiến. Chỉ dùng thông điệp an toàn cho người dùng trong `AppError`. Lỗi ngoài dự kiến được ghi phía server kèm trace ID và trả thông báo 500 chung; không đưa SQL hay stack trace vào response. Header `X-Request-Id` chứa cùng trace ID để đối chiếu.

### Bàn giao các phần việc tiếp theo

Xem [Checklist Buổi 4 cho Vinh và Kiên](docs/checklist-buoi4-vinh-kien.md): việc cần làm theo từng vai trò, hợp đồng tích hợp đề xuất, đầu ra và bảng nghiệm thu.

- Linh (V1): cấu trúc ba tầng, cấu hình chung, xử lý lỗi tập trung và rà soát cách các tầng kết nối.
- Vinh (V2 và V3): lược đồ/seed, repository và nghiệp vụ được giao. Giao dịch nhiều bảng cần dùng cùng một connection, có commit/rollback và release.
- Kiên (V3 và V4): nghiệp vụ được giao, bcrypt/Argon2, đăng ký/đăng nhập/đăng xuất, middleware xác thực/quyền chức năng và kiểm thử quyền sở hữu.
- Nhóm phân chia cụ thể các API nghiệp vụ giữa Vinh và Kiên trước khi triển khai để tránh cùng sửa một module. Người phụ trách triển khai online (V5) chưa được chốt.

Hiện chỉ có hai API công khai health và danh sách sản phẩm. Chưa có JWT, đăng ký, đăng nhập, đăng xuất, API quản trị hoặc nghiệp vụ mua hàng. Khung này là đầu ra V1 ban đầu, chưa phải toàn bộ sản phẩm nghiệm thu Buổi 4. CORS không thay thế xác thực/phân quyền.

### Kiểm chứng

`npm test` kiểm tra luồng ba tầng với DB giả lập, phân trang, health/404, JSON sai, body quá lớn, charset sai, ánh xạ lỗi SQL, trace ID và không lộ bí mật trong phản hồi/log. Bộ test không yêu cầu database thật và không chứng minh tương thích schema đã triển khai. Khi Vinh nhập SQL Buổi 3, chạy thêm:

```powershell
Invoke-RestMethod 'http://localhost:3000/api/v1/health'
Invoke-RestMethod 'http://localhost:3000/api/v1/products?page=1&limit=20'
```

Ảnh cấu trúc thư mục và endpoint mẫu chạy thật có thể dùng chuẩn bị bằng chứng kiến trúc theo yêu cầu Buổi 4. Nhóm cần triển khai online và thu ảnh nghiệm thu sau khi tích hợp các phần còn lại.
