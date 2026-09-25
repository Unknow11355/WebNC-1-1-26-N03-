# Quy tắc code của nhóm

Tài liệu áp dụng cho backend dự án quản lý vận hành siêu thị được xây lại từ đầu. Mục tiêu là để Linh, Vinh và Kiên triển khai các module có cùng kiến trúc, cách đặt tên và hợp đồng API. Đây là quy ước V1 cho Buổi 4; các chức năng xác thực và nghiệp vụ đề cập bên dưới là yêu cầu khi triển khai tiếp, không phải tất cả đã có sẵn.

## 1. Công nghệ và định dạng

- Dùng Node.js 22.13+ (nhánh 22) hoặc 24 trở lên, Express 5, JavaScript ES modules (`import`/`export`) và MySQL. CI kiểm tra trên Node.js 22; nhóm nên thống nhất phiên bản nhánh 22 khi phát triển.
- Dùng `npm ci` khi lấy code về; commit cả `package.json` và `package-lock.json` khi thêm thư viện bằng `npm install`.
- UTF-8, xuống dòng LF, thụt lề 2 dấu cách, chuỗi dùng nháy đơn, có dấu chấm phẩy. Prettier định dạng tự động, độ dài dòng mục tiêu 100 ký tự.
- Biến/hàm dùng `camelCase`, lớp dùng `PascalCase`, hằng thực sự cố định dùng `UPPER_SNAKE_CASE`. Tên rõ nghĩa, tránh `data1`, `temp2` hoặc viết tắt khó hiểu.
- File theo mẫu `<module>.<layer>.js`: `product.controller.js`, `product.service.js`, `product.repository.js`. Kiểm thử dùng `<module>.test.js`.
- Comment giải thích lý do hoặc quy tắc khó hiểu; không chép lại từng dòng code. Không để code chết hoặc log token/mật khẩu.

## 2. Ranh giới ba tầng

| Thành phần | Làm gì | Không làm gì |
| --- | --- | --- |
| Route | Khai báo URL, method, middleware và controller | Viết SQL hoặc nghiệp vụ |
| Controller | Lấy body/query/params và danh tính từ middleware, gọi service, trả status/JSON | Truy cập pool/repository hoặc quyết định quy tắc nghiệp vụ |
| Service | Kiểm tra đầu vào, quyền sở hữu, quy tắc và điều phối giao dịch | Dùng `req`, `res`, gọi Express hoặc viết SQL |
| Repository | Truy vấn tham số hóa, nhận connection khi cần giao dịch, trả dữ liệu | Trả HTTP response, tự quyết định vai trò hoặc thông báo cho giao diện |
| Middleware | Xác thực, quyền chức năng, trace ID, lỗi tập trung | Thay thế kiểm tra quyền sở hữu trong service |

Luồng chuẩn: route → controller → service → repository → database. Tạo các đối tượng và truyền dependency tại nơi ghép ứng dụng (`app.js`, `server.js` hoặc module cấu hình); tránh tự tạo pool mới trong từng module.

Service nhận dữ liệu JavaScript thuần. Khi có xác thực, controller truyền thêm danh tính đã được middleware xác minh; không tin `user_id`, `role` trong body để xác định người đang gọi. Repository không trả `password`, `password_hash`, OTP hoặc dữ liệu nội bộ qua API công khai. Chọn cột rõ ràng thay vì `SELECT *`.

ESLint chặn một số import sai tầng phổ biến. Việc SQL bị viết trực tiếp trong service hoặc quy tắc nghiệp vụ đặt sai chỗ vẫn cần Linh rà soát khi review; lint không chứng minh toàn bộ kiến trúc đúng.

## 3. URL và phương thức HTTP

Mọi API dùng tiền tố `/api/v1`. Tài nguyên dùng danh từ số nhiều, chữ thường; nhiều từ dùng dấu gạch ngang, ví dụ `/work-shifts`. Không tạo thêm alias `/api/products`, `/products` cho cùng API.

| Method | Ý nghĩa | Ví dụ thiết kế |
| --- | --- | --- |
| GET | Đọc dữ liệu, không làm thay đổi trạng thái nghiệp vụ | `/products`, `/products/:productId` |
| POST | Tạo bản ghi hoặc thực hiện hành động nghiệp vụ | `/products`, `/orders/:orderId/confirm` |
| PATCH | Cập nhật một phần dữ liệu | `/products/:productId` |
| PUT | Thay thế toàn bộ tài nguyên nếu hợp đồng API thật sự cần | Không dùng thay PATCH tùy ý |
| DELETE | Xóa theo điều kiện nghiệp vụ | `/categories/:categoryId` |

Express viết `:productId`; OpenAPI viết `{productId}`. Hai cách biểu diễn phải chỉ cùng tham số. Các ví dụ trên chưa được triển khai trừ `GET /products`.

Thuộc tính dữ liệu nghiệp vụ trong JSON dùng `snake_case` khớp lược đồ, ví dụ `product_id`, `product_name`; JavaScript nội bộ dùng `camelCase` và ánh xạ rõ tại ranh giới khi cần. Các trường khung phản hồi đã có như `traceId`, `totalPages` giữ nguyên. Tên role dùng đúng `admin`, `employee`, `customer`.

Danh sách dùng `page` và `limit`, mặc định lần lượt 1 và 20; tối đa 20 bản ghi/trang, trang tối đa 1.000.000 trong khung hiện tại. Tham số sai trả 400, không âm thầm sửa thành giá trị khác. Trang vượt dữ liệu trả danh sách rỗng. Tìm kiếm `q`, lọc và `sort` chỉ được bổ sung khi đã có đặc tả, whitelist trường sắp xếp và test; API hiện tại chỉ có phân trang.

Khi đưa hồ sơ/OpenAPI Buổi 3 vào repo, cập nhật đồng thời với endpoint. Nếu tài liệu cũ ghi giới hạn 100 hoặc tên JSON khác, cần thống nhất lại với quy ước này trước khi tích hợp frontend; không coi tài liệu cũ đã tự đồng bộ.

## 4. Phản hồi và lỗi

Thành công có `success: true` và `data`; danh sách có thêm `meta`. Phản hồi 204 không có body. Không trả HTTP 200 cho một thao tác thất bại.

```json
{
  "success": true,
  "data": [{ "product_id": 1, "product_name": "Sữa" }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

| HTTP | Quy tắc |
| --- | --- |
| 200 | Đọc hoặc cập nhật thành công |
| 201 | Tạo thành công |
| 204 | Thành công và không trả body |
| 400 | Dữ liệu đầu vào sai định dạng/kiểu/giới hạn |
| 401 | Thiếu hoặc không có xác thực hợp lệ |
| 403 | Đã xác thực nhưng thiếu quyền |
| 404 | Không có tài nguyên/API; có thể dùng để che tài nguyên không thuộc sở hữu |
| 409 | Trùng dữ liệu hoặc xung đột trạng thái |
| 413 | Body/file vượt giới hạn |
| 422 | Vi phạm quy tắc nghiệp vụ dù đúng định dạng |
| 429 | Vượt giới hạn số lần gọi |
| 500 | Lỗi ngoài dự kiến phía server |

Dùng `AppError` cho lỗi dự kiến, ví dụ trong service:

```js
throw new AppError(409, 'CONFLICT', 'Mã sản phẩm đã tồn tại');
```

`code` dùng `UPPER_SNAKE_CASE`, message tiếng Việt an toàn cho người dùng; `details` là mảng `{ field, issue }`. Middleware tự thêm `traceId`, `timestamp`, `path`; controller không tự tạo nhiều định dạng lỗi khác nhau. Không bọc mọi hàm trong `try/catch` rồi trả lỗi chung: để lỗi Promise đi tới middleware; chỉ catch khi có thể chuyển lỗi đã biết hoặc rollback/dọn tài nguyên. Xem JSON lỗi đầy đủ trong README.

## 5. Dữ liệu, bảo mật và giao dịch

- Kiểm tra dữ liệu ở server; validation trên giao diện chỉ hỗ trợ trải nghiệm. Không ghép giá trị từ request vào SQL; dùng `execute(sql, params)`.
- Tên cột sắp xếp không được lấy trực tiếp từ request; ánh xạ qua whitelist vì placeholder SQL không thay thế tên cột.
- Khi bổ sung thao tác ghi nhiều bảng, service điều phối giao dịch qua abstraction dữ liệu: lấy một connection, bắt đầu giao dịch, truyền cùng connection cho mọi repository liên quan, commit khi thành công, rollback khi lỗi và release trong `finally`. Không mở/commit độc lập từng repository trong cùng luồng. Phần abstraction giao dịch chưa có trong khung.
- Kiên bổ sung middleware xác thực và quyền chức năng. Mỗi endpoint được phân loại công khai hoặc cần quyền theo ma trận Buổi 3. Service kiểm tra chủ sở hữu cho tài nguyên cá nhân, kể cả khi hai người có cùng vai trò.
- Dùng bcrypt/Argon2 cho mật khẩu, token có thời hạn; không ghi bí mật vào log, response, commit hoặc ảnh minh chứng. CORS không phải cơ chế phân quyền.
- `.env` chỉ lưu ở máy/môi trường chạy; cập nhật `.env.example` bằng giá trị mẫu khi thêm biến. Không chạy script reset CSDL khi server khởi động.

## 6. Git và phối hợp nhóm

- Nhánh hiện tại của Linh: `Linh/v1/buoi4`. Các thành viên dùng nhánh riêng theo mẫu `<Tên>/<vai-trò>/buoi4`, không cùng push vào một nhánh khi chưa thống nhất.
- Commit nhỏ, một mục đích; thông điệp `<type>: <nội dung>`, với `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Không commit `.env`, `node_modules`, log hoặc thông tin đăng nhập. Commit lockfile để cả nhóm cài cùng phiên bản.
- Trước khi sửa file chung (`app.js`, routes, config), thông báo trong nhóm để tránh ghi đè. Phân chia rõ API giữa Vinh và Kiên vì cả hai phụ trách V3.
- Gửi pull request khi cần gộp vào `main`: ghi chức năng, thay đổi API/schema, cách kiểm thử và phần còn thiếu. Linh rà soát kiến trúc; Vinh rà soát truy vấn/schema; Kiên rà soát xác thực và kiểm thử theo phần liên quan.
- Không force-push hoặc reset lịch sử nhánh chung để xử lý xung đột. Quy trình review là quy ước nhóm, chưa phải branch protection được bật trên GitHub.

## 7. Kiểm tra trước khi đẩy code

Chạy từ `backend`:

```powershell
npm ci
npm run format
npm run check
```

`format` chỉ định dạng JavaScript và cấu hình backend. `check` chạy ESLint, kiểm tra Prettier và kiểm thử. GitHub Actions chạy cùng lệnh trên mỗi push/pull request; không cần `.env` hoặc database vì các test hiện tại dùng DB giả lập.

Trước khi gộp, người làm kiểm tra:

- Endpoint đi đúng tầng, hợp đồng API và tên trường nhất quán.
- SQL tham số hóa; API được bảo vệ kiểm tra quyền ở server khi được triển khai.
- Lỗi trả đúng mã, không lộ bí mật; log có đủ dấu vết để đối chiếu.
- Có kiểm thử phù hợp cho nghiệp vụ mới, gồm trường hợp lỗi/quyền sở hữu khi liên quan.
- README, `.env.example`, OpenAPI và migration/seed được cập nhật nếu thay đổi ảnh hưởng chúng.
- Với phần truy vấn mới, chạy kiểm tra tích hợp trên database thử nghiệm; test mock không thay thế kiểm chứng SQL thật.

Các hạng mục xác thực, giao dịch và triển khai online phải được nghiệm thu sau khi các thành viên hoàn thành; không đánh dấu đã đạt chỉ vì có quy tắc trong tài liệu này.
