# Checklist Buổi 4 cho Vinh và Kiên

Đề tài: Hệ thống quản lý vận hành siêu thị. Nhóm xây dựng lại từ đầu; source cũ chỉ tham khảo nghiệp vụ. Checklist này áp dụng sau khung V1 trên nhánh `Linh/v1/buoi4` và đối chiếu Sổ tay thực hành 10 buổi, trang 27–30.

Các ô để trống là việc cần thực hiện hoặc cần xác nhận, không phải bằng chứng đã hoàn thành. Phân chia module và endpoint dưới đây là đề xuất cụ thể của nhóm để hai bạn cùng làm V3 mà không trùng phần việc; không phải danh mục endpoint bắt buộc do thầy quy định.

## 1. Chia phần việc

| Người | Vai trò | Phạm vi code chính | Sản phẩm bàn giao |
| --- | --- | --- | --- |
| Vinh | V2 và phần V3 | Lược đồ/seed; repository; nghiệp vụ giỏ hàng mẫu và quyền sở hữu | Database dựng lại được; tầng truy cập dữ liệu; tạo/xem giỏ đi đủ ba tầng |
| Kiên | Phần V3 và V4 | Đăng ký/đăng nhập/đăng xuất; băm mật khẩu; JWT và quyền chức năng; kiểm thử | Xác thực chạy được; middleware; kết quả 401/403 và truy cập chéo |
| Linh | V1 | Rà soát cấu trúc, xử lý lỗi chung, quy ước và tích hợp | Khung chung và kết quả rà soát |

Không cần hoàn thiện thanh toán, xử lý đơn, nhập kho, voucher hay ca làm trong checklist này. Buổi 4 tập trung kiến trúc, xác thực, phân quyền và một chức năng mẫu có chủ sở hữu.

## 2. Việc hai bạn thống nhất trước khi code

- [ ] Lấy code từ `Linh/v1/buoi4`, tạo nhánh cá nhân từ cùng phiên bản. Tên nhánh gợi ý: `Vinh/v2-v3/buoi4`, `Kien/v3-v4/buoi4`; checklist này chưa tạo các nhánh đó.
- [ ] Đọc `CONTRIBUTING.md`, README và `docs/xu-ly-loi-tap-trung.md`.
- [ ] Chạy được `npm ci` và `npm run check` trong `backend`.
- [ ] Thống nhất tên cột tài khoản, vai trò và mật khẩu băm. Nếu SQL cũ có cả `password` và `password_hash`, quyết định một nguồn dữ liệu chính, cập nhật script và code cùng nhau.
- [ ] Thống nhất middleware gán `req.auth = { userId, role }` sau khi xác minh danh tính. Đây là hợp đồng dự kiến cần triển khai; code nền chưa có `req.auth`.
- [ ] Thống nhất các hàm repository Vinh cung cấp cho Kiên: tìm tài khoản theo email/ID, tạo khách hàng, lấy vai trò/trạng thái và thao tác dữ liệu phiên/thu hồi token nếu cơ chế đã chọn cần.
- [ ] Chốt thiết kế đăng xuất có hiệu lực phía server. Nếu dùng JWT, xác định cách thu hồi và kiểm tra token đã bị thu hồi; xóa token ở frontend không đủ cho ca thử gọi lại bằng token cũ.
- [ ] Chốt hợp đồng API bên dưới và cập nhật OpenAPI Buổi 3 tương ứng; không coi tài liệu cũ đã tự đồng bộ với code mới.

### Hợp đồng API đề xuất để làm Buổi 4

Mọi đường dẫn đều có tiền tố `/api/v1`. Thuộc tính JSON nghiệp vụ dùng `snake_case`; role là `admin`, `employee`, `customer`.

| Method và đường dẫn | Người thực hiện | Quyền | Kết quả cần có |
| --- | --- | --- | --- |
| POST `/auth/register` | Kiên, dùng repository của Vinh | Công khai | 201; khách mới được tạo, không trả mật khẩu/hash |
| POST `/auth/login` | Kiên | Công khai | 200; JWT có hạn hoặc lỗi xác thực 401 |
| POST `/auth/logout` | Kiên | Đã đăng nhập | 204 không body; token cũ không dùng tiếp được |
| GET `/auth/me` | Kiên | Đã đăng nhập | 200; thông tin tài khoản hiện tại, không có bí mật |
| GET `/users` | Kiên controller/service, Vinh repository | Admin | 200 và phân trang; khách/nhân viên nhận 403 |
| POST `/carts` | Vinh, dùng middleware Kiên | Customer | 201; tạo giỏ của người đang gọi |
| GET `/carts/:cartId` | Vinh, dùng middleware Kiên | Customer là chủ giỏ | 200 cho chủ giỏ, 403 hoặc 404 cho người khác |

`GET /users` là luồng đọc tối thiểu để kiểm chứng quyền Admin, không yêu cầu hoàn thành CRUD nhân sự. Giỏ mẫu chỉ cần tạo và đọc để chứng minh sở hữu; chưa yêu cầu thêm sản phẩm hoặc checkout. Nếu giỏ đã có do ràng buộc một giỏ/người, thống nhất trả 409 và chuẩn bị tài khoản thử chưa có giỏ.

## 3. Checklist của Vinh

### V2 — dữ liệu và repository

- [ ] Đưa script lược đồ và seed Buổi 3 đã thống nhất vào repository, ghi rõ thứ tự chạy trong README. Không import nguyên source cũ vào dự án mới.
- [ ] Kiểm tra tạo CSDL từ rỗng trên môi trường thử; lưu log/ảnh số bảng và dữ liệu. Không reset database đang dùng mà chưa thống nhất trong nhóm.
- [ ] Chuẩn bị ít nhất một Admin, một Nhân viên và hai Khách hàng A/B bằng dữ liệu giả lập; mật khẩu seed phải băm bằng cơ chế Kiên sử dụng.
- [ ] Hai khách A/B có thể đăng nhập, có ID khác nhau và cùng role; ít nhất A chưa có giỏ để chạy bước tạo bản ghi.
- [ ] Kiểm tra PK/FK/UNIQUE cần cho tài khoản và giỏ, đặc biệt email duy nhất, chủ giỏ và giới hạn một giỏ/người nếu áp dụng.
- [ ] Viết `user.repository.js`, `cart.repository.js` và repository vai trò/phiên nếu cần; dùng pool chung và truy vấn tham số hóa.
- [ ] Kiểm tra `product.repository.js` có sẵn chạy với schema nhóm đã chốt; không viết lại API mẫu nếu không cần.
- [ ] Repository không nhận `req/res`, không trả HTTP response và không tự quyết định quyền.
- [ ] Hàm tìm tài khoản phục vụ đăng nhập chỉ chuyển hash cho service nội bộ; các hàm trả danh sách/hồ sơ không chọn cột mật khẩu, OTP hoặc token.
- [ ] Chạy thử SQL thật cho tìm email, tạo tài khoản, tạo/đọc giỏ; kiểm tra trùng email/giỏ và khóa ngoại.

### V3 — giỏ mẫu và quyền sở hữu

- [ ] Viết controller → service → repository cho tạo và xem giỏ, theo cấu trúc module product.
- [ ] Lấy chủ giỏ từ `req.auth.userId` đã được middleware xác minh; không lấy người chủ từ `user_id` do client tự gửi.
- [ ] Controller chuyển danh tính đã xác minh và tham số thuần cho service; SQL chỉ ở repository.
- [ ] Service kiểm tra ID hợp lệ và quyền sở hữu trước khi trả dữ liệu; không trả chi tiết giỏ của người khác.
- [ ] Dùng `AppError` và middleware lỗi chung; thống nhất trả 403 hoặc 404 cho truy cập giỏ không thuộc sở hữu.
- [ ] Gắn middleware xác thực và role Customer do Kiên cung cấp vào route giỏ.
- [ ] Nếu một thao tác phải ghi nhiều bảng, dùng cùng connection và transaction với commit/rollback/release; thao tác chỉ một INSERT không cần tạo giao dịch nhiều bảng cho hình thức.
- [ ] Kiểm thử: A tạo giỏ thành công; A xem được; B cùng role gọi ID giỏ A bị từ chối; sửa `user_id` trong request không đổi được chủ giỏ.

### Vinh bàn giao

- [ ] Script database và hướng dẫn dựng lại; repository chạy được và module giỏ mẫu.
- [ ] Danh sách hàm repository cùng đầu vào/đầu ra để Kiên tích hợp.
- [ ] Kết quả SQL/test thật, commit cá nhân và mô tả các phần đã/chưa xong.
- [ ] Cập nhật chỉ số V2: số bảng đã rà soát ràng buộc/chỉ mục; trung vị thời gian truy vấn nóng, kèm cách đo.
- [ ] Cập nhật chỉ số V3 cho phần được giao: số endpoint chạy được; số quy tắc đã hiện thực và kiểm chứng.

## 4. Checklist của Kiên

### V3 — xác thực

- [ ] Viết route/controller/service đăng ký, đăng nhập, đăng xuất và thông tin người hiện tại; dùng repository của Vinh.
- [ ] Kiểm tra email, mật khẩu và trường bắt buộc ở server; đăng ký công khai luôn tạo Customer, bỏ qua/từ chối role Admin do client gửi.
- [ ] Băm mật khẩu bằng bcrypt hoặc Argon2, xác minh hash khi đăng nhập; không mã hóa hai chiều hoặc lưu mật khẩu thuần.
- [ ] Đăng nhập sai trả 401 với thông điệp chung; không tiết lộ tài khoản nào tồn tại qua thông điệp đăng nhập.
- [ ] Thiết lập JWT có thời hạn hoặc cơ chế phiên đã chốt; bí mật cấu hình qua `.env`, `.env.example` chỉ có mẫu.
- [ ] Thực hiện đăng xuất phía server theo thiết kế; gọi lại API bằng token/phiên cũ phải bị từ chối.
- [ ] Hồ sơ, đăng ký và đăng nhập không trả `password`, `password_hash`, OTP hoặc dữ liệu bí mật không cần thiết.
- [ ] Hoàn thiện `GET /users` chỉ đọc, phân trang và chỉ cho Admin, dùng repository Vinh cung cấp.

### V4 — middleware và kiểm thử

- [ ] Middleware xác thực kiểm tra chữ ký/thời hạn và trạng thái thu hồi theo cơ chế chọn; thiếu/sai/hết hạn token trả 401.
- [ ] Middleware gán đúng `req.auth`; không tin role từ body/query hoặc token chưa kiểm chữ ký.
- [ ] Middleware quyền chức năng trả 403 khi đã xác thực nhưng không đủ role; thực thi tại backend.
- [ ] Gắn middleware đúng thứ tự: xác thực → kiểm role → controller. Đăng ký/đăng nhập vẫn công khai.
- [ ] Phối hợp Vinh kiểm tra quyền sở hữu tại service, không chỉ ẩn nút trên giao diện hoặc kiểm role.
- [ ] Chạy các ca nghiệm thu ở bảng dưới, ghi kết quả thực tế; không chỉ ghi kết quả dự kiến.
- [ ] Chạy `npm run check`; bổ sung test auth, quyền và đăng xuất. Bộ test nền hiện tại chưa chứng minh xác thực đã hoạt động.
- [ ] Chụp yêu cầu và kết quả, có URL/method/status/ngữ cảnh tài khoản; che giá trị token và bí mật, giữ rõ danh tính giả lập/role cần đối chiếu.
- [ ] Chuẩn bị Ảnh 19, 21 theo phân công sổ tay; đối chiếu danh mục ảnh gốc trước khi gán số cho từng ảnh. Thu cả bằng chứng phiên/token và truy cập chéo theo yêu cầu chung, không tự suy đoán ý nghĩa Ảnh 22.

### Kiên bàn giao

- [ ] Module auth, middleware và API đọc Admin; thông tin biến môi trường mẫu.
- [ ] Bảng kiểm thử có bước thực hiện, kỳ vọng, thực tế, đạt/chưa đạt và tên ảnh/log.
- [ ] Bằng chứng mật khẩu băm, 401, 403, truy cập chéo và thời hạn phiên/token; bằng chứng đăng xuất.
- [ ] Commit cá nhân; chỉ số V3 cho phần được giao; chỉ số V4 gồm số rủi ro BM1–BM12 có bằng chứng và số ca chạy/tỷ lệ đạt.

## 5. Bảng nghiệm thu tích hợp

Các ca sau là bộ kiểm tra nhóm đề xuất dựa trên yêu cầu Buổi 4. Không đánh dấu đạt trước khi chạy thật.

| Mã | Thao tác | Kết quả kỳ vọng | Thực tế / bằng chứng |
| --- | --- | --- | --- |
| B4-01 | Tạo database từ script trên môi trường thử | Dựng được bảng và tài khoản seed | Chưa chạy |
| B4-02 | Đăng ký hợp lệ, kiểm tra bản ghi | 201; mật khẩu băm; role Customer | Chưa chạy |
| B4-03 | Đăng ký trùng email hoặc gửi role Admin | Trùng email bị từ chối; không tạo được quyền Admin | Chưa chạy |
| B4-04 | Đăng nhập lần lượt ba vai trò | Đăng nhập đúng; danh tính/role khớp dữ liệu | Chưa chạy |
| B4-05 | Gọi API được bảo vệ không có token | 401 | Chưa chạy |
| B4-06 | Gọi với token sai chữ ký hoặc hết hạn | 401 | Chưa chạy |
| B4-07 | Customer/Employee gọi GET /users | 403 | Chưa chạy |
| B4-08 | Admin gọi GET /users | 200; không trả mật khẩu/hash | Chưa chạy |
| B4-09 | A tạo giỏ rồi A đọc giỏ đó | 201 rồi 200; chủ giỏ đúng A | Chưa chạy |
| B4-10 | B cùng role gọi ID giỏ của A | 403 hoặc 404; không lộ dữ liệu của A | Chưa chạy |
| B4-11 | Gửi user_id của B khi A tạo giỏ | Không tạo giỏ dưới danh tính B | Chưa chạy |
| B4-12 | Đăng xuất rồi gọi lại bằng token cũ | Logout thành công; lần gọi sau 401 | Chưa chạy |
| B4-13 | Kiểm tra JWT/phiên | Có thời hạn; nếu cookie thì kiểm tra thuộc tính bảo vệ tương ứng | Chưa chạy |
| B4-14 | Chạy npm run check sau tích hợp | Lint, định dạng và test đạt | Chưa chạy |
| B4-15 | Chạy bản tích hợp trên môi trường online | Xác thực và phân quyền hoạt động, có ảnh thật | Chưa chạy; cần người V5 |

Ảnh truy cập chéo cần cả lần A thao tác thành công và lần B bị từ chối trên cùng ID. Không dùng ảnh mock test để thay ảnh thao tác thật khi nghiệm thu.

## 6. Thứ tự phối hợp và điểm còn cần phân công

1. Cả hai thống nhất schema, chữ ký hàm repository, `req.auth` và hợp đồng API.
2. Vinh hoàn thiện dữ liệu/repository; Kiên làm băm mật khẩu, xác thực và middleware dựa trên hợp đồng đó.
3. Vinh tích hợp giỏ mẫu và kiểm chủ sở hữu; Kiên tích hợp auth và API Admin.
4. Hai bạn chạy bảng nghiệm thu; Linh rà soát ba tầng, lỗi chung và các file tích hợp.
5. Người được giao V5 triển khai bản chung, chạy lại trên online và thu ảnh theo sổ tay.

V5 hiện chưa được phân công. Yêu cầu toàn nhóm cuối Buổi 4 gồm chạy local và online, xác thực, phân quyền hai mức và bộ ảnh 07–10, 12, 19, 21, 22. Checklist này không tự giao V5 cho Vinh hoặc Kiên và không khẳng định các phần đó đã hoàn thành.
