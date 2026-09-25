# Xử lý lỗi tập trung Buổi 4

Phần V1 cung cấp một nơi chuyển lỗi thành HTTP/JSON cho cả nhóm. Phản hồi lỗi có `success: false` và `error` gồm `code`, `message`, `details`, `traceId`, `timestamp`, `path`.

## Luồng xử lý

`app.js` tạo trace ID trước khi đọc JSON. Express 5 chuyển lỗi parser và lỗi Promise từ controller/service/repository đến `error-handler.js`. URL không có route trở thành AppError 404. `normalize-error.js` ánh xạ lỗi đã biết, sau đó middleware ghi log và trả JSON. Nếu response đã gửi headers, handler chuyển tiếp cho Express, không gửi JSON lần hai.

| Trường hợp | HTTP | Code |
| --- | --- | --- |
| AppError 400–499 | Giữ status nghiệp vụ | Giữ code, message và details an toàn |
| JSON sai | 400 | VALIDATION_ERROR |
| Body JSON vượt 1 MB | 413 | PAYLOAD_TOO_LARGE |
| Charset/encoding parser không hỗ trợ | 415 | UNSUPPORTED_MEDIA_TYPE |
| MySQL trùng dữ liệu duy nhất | 409 | CONFLICT |
| MySQL vi phạm khóa ngoại khi ghi/xóa | 409 | CONFLICT |
| Lỗi khác, kể cả AppError 5xx | 500 | INTERNAL_ERROR |

Không trả thông điệp gốc của lỗi SQL/5xx. Khi cần thông điệp nghiệp vụ cụ thể, service chuyển lỗi đã hiểu thành AppError an toàn; không chuyển mọi lỗi database thành 400.

## Cách dùng trong service

```js
import { AppError } from '../errors/app-error.js';

throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
```

Ví dụ trên chỉ minh họa lớp lỗi; Kiên vẫn cần triển khai kiểm tra quyền thật. Controller không catch rồi tạo một định dạng JSON lỗi khác. Người viết AppError 4xx chịu trách nhiệm dùng message và details có thể công khai.

Log gồm `event`, `traceId`, `timestamp`, `method`, `status`, `code`; không ghi nguyên error, SQL, stack, body, headers hoặc query string. Đối chiếu trace ID giữa header `X-Request-Id`, JSON và terminal. Đây là log chẩn đoán tối thiểu, chưa thay thế audit log nghiệp vụ. Thông tin gỡ lỗi bổ sung phải lọc dữ liệu nhạy cảm.

## Chạy và chụp minh chứng

1. Trong `backend`, chạy `npm ci` rồi `npm start`.
2. Mở `requests/errors.http` bằng REST Client hoặc nhập các request vào Postman.
3. Gọi `GET /api/v1/products?limit=0`: chụp method, URL, HTTP 400 và JSON lỗi. Ca này không cần database.
4. Gọi `GET /api/v1/does-not-exist`: chụp HTTP 404 và JSON cùng cấu trúc.
5. Chụp terminal có log `request_failed` với trace ID khớp phản hồi.
6. Chạy `npm run check` để kiểm chứng và chụp kết quả đạt.

Ca 409/500 dùng lỗi repository giả lập trong test; không tạo endpoint phá lỗi 500 trên ứng dụng. Test còn kiểm tra JSON sai, body quá lớn, charset sai, trace ID, không lộ bí mật và response đã gửi headers. Kiểm thử này không thay thế chạy nghiệp vụ ghi MySQL thật khi các thành viên bổ sung chức năng.

Đây là gợi ý ảnh minh chứng V1; chưa gán số ảnh ngoài danh mục của thầy và chưa phải toàn bộ nghiệm thu Buổi 4.
