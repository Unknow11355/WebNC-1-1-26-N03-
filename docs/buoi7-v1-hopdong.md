# Buổi 7 — Hợp đồng thiết kế V1

Đây là yêu cầu triển khai mới, **chưa phải API đã có**. Giữ response/lỗi theo `CONTRIBUTING.md`. Vinh và Kiên xác nhận hợp đồng trước khi code; thay đổi phải cập nhật tài liệu và OpenAPI cùng nhau.

## 1. Tìm kiếm

Mở rộng `GET /api/v1/products`: `q`, `category_id`, `min_price`, `max_price`, `in_stock`, `sort`, `order`, `page`, `limit`. Điều kiện kết hợp AND; q tìm tên hoặc barcode. Giá không âm, min <= max; boolean chỉ nhận giá trị quy định; q tối đa 100 ký tự. Public chỉ thấy active.

Mặc định page=1, limit=20, sort=product_id, order=asc. Giữ hợp đồng hiện tại: limit ngoài 1..20 trả 400, không tải toàn bộ. Sort chỉ product_id/product_name/price/stock; order chỉ asc/desc; ánh xạ tên cột nội bộ, không ghép chuỗi đầu vào. Nếu sort khác product_id, thêm product_id cùng chiều để ổn định. Data và COUNT dùng cùng bộ lọc. Test không lặp/bỏ sót trên dataset không bị ghi đồng thời; offset không bảo đảm snapshot khi dữ liệu đang thay đổi.

## 2. Ba báo cáo (admin)

Chọn ba báo cáo bán hàng từ source cũ thay vì tự dựng lịch sử tồn kho chưa có snapshot. Thống kê kho lịch sử không được giả bằng tồn hiện tại.

| Mã/API đề xuất | Nguồn/nhóm | Số liệu và biểu đồ |
| --- | --- | --- |
| R1 GET `/api/v1/reports/revenue` | orders + payments đã tổng hợp theo order_id; nhóm ngày | Số đơn đã trả tiền, tổng final_amount, tổng discount_amount; đường doanh thu theo ngày |
| R2 GET `/api/v1/reports/products` | orders + order_items + products; nhóm sản phẩm | SUM(quantity), SUM(quantity * price); cột top sản phẩm. Tiền dòng là doanh số trước giảm giá cấp đơn, không gắn nhãn doanh thu thuần |
| R3 GET `/api/v1/reports/employees` | orders + users + payments đã tổng hợp theo order_id; nhóm employee_id | Số đơn thu tiền và tổng final_amount; cột doanh thu nhân viên. Đơn chưa gán nhân viên có nhóm riêng, không bỏ khỏi tổng |

Vinh xác minh tên cột với schema trước khi code. Bộ lọc chung `from=YYYY-MM-DD`, `to=YYYY-MM-DD` gồm cả hai ngày, tối đa 366 ngày. API chuyển khoảng ngày Asia/Ho_Chi_Minh thành khoảng timestamp [đầu from, đầu ngày sau to); chuẩn hóa timezone kết nối/DB và fixture. Chọn `orders.paid_at` làm thời gian ghi nhận, chỉ orders.payment_status='paid', loại cancelled/rejected theo enum thực tế. Dữ liệu paid thiếu paid_at phải báo chênh lệch chất lượng dữ liệu, không tự lấy ngày hôm nay.

R1/R3 lấy tiền cấp đơn đúng một lần; không JOIN thẳng nhiều payments với nhiều order_items gây nhân doanh thu. Dùng aggregate/EXISTS/subquery phù hợp; không tính báo cáo bằng vòng lặp tải toàn bộ giao dịch. R2 không cộng final_amount cho từng dòng hàng. Giữ đơn lịch sử dù sản phẩm/nhân viên inactive, xử lý LEFT JOIN nếu thiếu tham chiếu. Không công bố lợi nhuận lịch sử từ giá nhập mới nhất vì chưa có giá vốn chụp tại thời điểm bán.

Mỗi API trả `data` và `meta` (bộ lọc, timezone, đơn vị VND, thời điểm tạo báo cáo); bảng/biểu đồ/file cùng bộ lọc. Kiên chọn CSV UTF-8 hoặc Excel; CSV quote đúng dấu phẩy, dấu nháy, xuống dòng, chặn formula injection với ô văn bản bắt đầu =,+,-,@. Export đi qua kiểm quyền server; không dựa vào ẩn nút. Dataset rỗng vẫn có header, số liệu 0 và trạng thái giao diện rõ.

Fixture đối chiếu do Vinh tạo trên DB test: 2 đơn paid A/B ngày D, A final=90.000 discount=10.000 có 2 dòng (P1: 2*30.000, P2: 1*40.000), B final=50.000 discount=0 (P1: 1*50.000). Có thêm đơn unpaid/cancelled và đơn ngoài khoảng, phải bị loại. R1 ngày D: 2 đơn, 140.000 thuần, 10.000 giảm; R2: P1 lượng 3/doanh số dòng 110.000, P2 lượng 1/40.000; R3 A của E1=90.000 và B của E2=50.000. Giá dòng lịch sử có thể khác giá hiện tại. Thêm fixture payments nhiều dòng để phát hiện nhân bản tổng. Đây là **kỳ vọng**, chưa phải kết quả chạy.

## 3. Upload (Kiên V4 triển khai)

Đề xuất `POST /api/v1/uploads/product-image`, multipart field `file`, admin. JPEG/PNG/WebP, tối đa 5 MiB (5*1024*1024 byte). Kiểm tra signature và decode ảnh, không chỉ MIME/đuôi; từ chối SVG/script/ảnh hỏng và giới hạn kích thước pixel để tránh giải nén quá mức. Sinh tên ngẫu nhiên, không dùng path từ client; lưu ngoài thư mục thực thi/repo và có lưu trữ bền vững khi deploy. Dùng thư viện đã kiểm tra phiên bản, không tự viết parser ảnh sơ sài.

201 trả định danh ảnh và URL dùng cho image_url; 400 request lỗi, 413 quá dung lượng, 415 kiểu không hợp lệ, 401/403 xác thực/quyền. Truy xuất chỉ ảnh đã duyệt; public được xem ảnh sản phẩm công khai, không liệt kê thư mục hoặc đọc file tùy ý. Có Content-Type đúng/nosniff. Giới hạn body tại proxy lẫn app, xử lý file tạm khi lỗi; không xóa ảnh đang được sản phẩm khác tham chiếu.

## 4. Nhật ký hệ thống

Vinh thêm migration audit_logs: id, actor_id nullable, action, entity_type/id nullable, outcome, request_id, created_at, metadata tối thiểu; index thời gian+id, actor+thời gian. Sự kiện: LOGIN_SUCCESS, LOGIN_FAILURE, ROLE_CHANGED, DATA_DELETED (bao gồm soft-delete). Không ghi mật khẩu, token, OTP hoặc toàn bộ request body. Login thất bại khi chưa có actor vẫn ghi được; chống log injection và hạn chế dữ liệu cá nhân.

Thay đổi quyền/xóa và audit thành công cùng transaction để không ghi thành công giả khi rollback. Login failure không được mất log do rollback transaction nghiệp vụ; xử lý lỗi lưu log có cảnh báo vận hành, không lộ dữ liệu. Không API sửa/xóa audit cho người dùng thường.

`GET /api/v1/audit-logs`: admin; lọc actor/action/outcome/from/to; phân trang tối đa 20; sort created_at DESC, id DESC. Kiên làm màn hình bộ lọc, bảng, phân trang, trạng thái rỗng/lỗi. Console log và inventory_logs không thay audit.

## 5. Khoảng trống bổ sung K1/K9/K10

- Vinh: đổi mật khẩu cần mật khẩu hiện tại; reset dùng token ngẫu nhiên hash khi lưu, hết hạn/một lần; phản hồi không lộ email tồn tại, rate limit; thu hồi phiên theo thiết kế. Kiên test. Không hiển thị reset token trong API production; kênh demo phải riêng môi trường test.
- Vinh: notifications thêm recipient_user_id/FK/index, order/event chống lặp; ghi cùng transaction confirm/reject. API đề xuất GET `/notifications`, PATCH `/notifications/:id/read`, chỉ chính người nhận. Không trả thông báo mọi khách chỉ vì bảng cũ thiếu owner.
- Kiên: trang công khai danh sách/chi tiết có title, description, heading/label, ảnh có mô tả, focus và thao tác bàn phím; bảng audit/report chỉ admin. Không coi frontend che nút là phân quyền.

Các endpoint bổ sung chốt OpenAPI trước khi hiện thực. Không đưa bí mật hoặc URL nội bộ nhạy cảm vào ảnh/file bàn giao.
