# Giao diện web Siêu thị mini

Cập nhật CN02 (06/10/2026): đã có sửa hồ sơ cá nhân (họ tên/điện thoại/địa chỉ) qua `PATCH /auth/me`. Xem [hướng dẫn và kiểm thử CN02](../docs/capnhathoso.md). Các ghi chú “chỉ đọc hồ sơ” bên dưới mô tả bản frontend ban đầu, không còn áp dụng cho CN02.

Nhánh riêng: `Linh/giaodien/chucnanghienco`, nền `Linh/v1/buoi7` (có code Buổi 6 và bản tích hợp `tichhopLinhcheckvasualai`). Không thay nghiệp vụ/backend/database để phục vụ giao diện.

## Chạy local

Node.js theo bảng phiên bản backend. Không cần npm install cho frontend vì không có dependency chạy ứng dụng.

1. Dựng backend và database theo README gốc, migration đến Buổi 6; chạy backend ở cổng 3000. Không chạy reset trên DB có dữ liệu cần giữ.
2. Terminal khác:

```powershell
cd frontend
npm start
```

3. Mở `http://127.0.0.1:5173`. Đăng nhập bằng tài khoản đã có trong DB nhóm; frontend không tự seed tài khoản, không có mật khẩu production hardcode.

Nếu API ở cổng/host khác, cấu hình **phía server** trước khi chạy:

```powershell
$env:API_ORIGIN = 'http://127.0.0.1:3000'
$env:PORT = '5173'
npm start
```

Server frontend chỉ bind loopback, phục vụ local. Khi triển khai: dùng HTTPS/reverse proxy được quản lý, phục vụ các file tĩnh và `/assets/images/`, chuyển `/api/v1/` đến backend. Không trỏ trình duyệt trực tiếp đến database. Không coi chạy local là đã phát hành online.

## Đối chiếu source Flutter

| Source tham khảo `lib/screens/` | Màn hình web |
| --- | --- |
| home_screen, product_detail_screen | `#shop`, thẻ sản phẩm, chi tiết, tìm tên/mã vạch + danh mục, phân trang |
| login/password_login/register | `#login`, `#register`; vai trò lấy từ API, không cho tự chọn quyền khi đăng nhập |
| customer_online_checkout, purchase_history, order_detail | `#cart`, `#orders`; giao hàng/nhận tại cửa hàng, voucher, tiền mặt, nhận hàng |
| checkout/payment, employee_confirm_orders | `#pos`, `#orders`; thu tiền, xác nhận/từ chối có lý do |
| inventory_management/import_inventory/inventory_check/inventory_history | `#inventory`, `#logs`; nhập kho, xuất lên kệ, kiểm kê, CRUD mặt hàng |
| product_management/edit_product | `#products`; tạo/sửa/ngừng bán; tồn sản phẩm mới bằng 0 theo backend |
| employee/customer_management | `#users`; quản lý tài khoản, vai trò và trạng thái |
| admin_vouchers | `#vouchers`; tạo/sửa/ngừng mã; không đổi code sau khi tạo |
| profile_view | `#profile`; chỉ đọc thông tin hiện tại |

Giữ màu xanh #1B7F4D, nền #F6F7F9, thẻ sản phẩm và menu theo vai trò. Desktop dùng sidebar, điện thoại dùng thanh điều hướng cuộn ngang; không phải bản sao pixel của màn hình Flutter. Dùng HTML/CSS/ES modules thuần, không buộc nhóm đổi stack backend. 17 ảnh trong assets được sao chép từ source người dùng cung cấp, không sinh ảnh hoặc lấy ảnh trên mạng. Mapping SKU prod001–prod015 kế thừa source; không có ảnh dùng placeholder, không tự bịa sản phẩm hay số liệu.

## Phạm vi đang chạy

- Public: sản phẩm/chi tiết; đăng ký, đăng nhập. Danh sách lấy tối đa 20 mục/trang từ server.
- Customer: giỏ hàng (thêm/sửa lượng/bỏ), kiểm tra voucher, checkout tiền mặt, lịch sử/chi tiết/nhận hàng, hồ sơ đọc.
- Employee/admin: kho + lịch sử kho, xử lý đơn, thu tiền, POS cash khách vãng lai.
- Admin: CRUD tài khoản/danh mục/sản phẩm/mặt hàng kho/voucher, khóa/mở trạng thái tài khoản.
- Lỗi/loading/rỗng, chống nhấn gửi lặp trong cùng thao tác, kiểm quyền menu; quyền thật vẫn do backend xác thực.

Chưa đưa thành nút hoạt động: khôi phục/đổi mật khẩu, tự sửa hồ sơ, báo cáo/biểu đồ, audit, thông báo, lịch/ca, điểm, đánh giá, upload, quét camera, ngân hàng/VNPAY. Những phần này chưa có API trong nền được dùng. Các yêu cầu Buổi 7 trong docs vẫn là việc cần làm, frontend này không tự đóng checklist đó.

## Bảo vệ dữ liệu và giới hạn

- Text từ API escape trước khi chèn HTML; ảnh chỉ URL http/https; không render HTML mô tả sản phẩm từ API. CSP/nosniff tại server tĩnh.
- Token lưu sessionStorage trong tab, không localStorage; logout gọi API thu hồi phiên. SessionStorage vẫn có rủi ro nếu có XSS, không thay cho kiểm thử bảo mật.
- POS lưu payload + Idempotency-Key trong tab trước khi gửi. Mất phản hồi/5xx giữ key khi thử lại và reload; lỗi xác định trước commit mới bỏ key. Không tự gửi lại checkout online vì endpoint đó chưa có idempotency.
- Không đóng tab đang có POS chưa rõ kết quả. Trước khi chuyển tài khoản hoặc xóa dữ liệu trình duyệt, đối soát đơn; sessionStorage không phải hàng đợi bền vững xuyên thiết bị.
- Tổng hiển thị là tạm tính; máy chủ quyết định giá/tồn/voucher. Giá thay đổi sau khi chọn có thể làm tổng server khác, cần thu ngân đối soát.
- Bộ lọc nâng cao/sort chưa có backend không hiển thị như đã hỗ trợ. Không tạo dashboard bằng số giả.
- URL ảnh tương đối ngoài assets cần được reverse proxy ảnh tương ứng khi triển khai; ảnh lỗi hiển thị placeholder. Không tự proxy đường dẫn file bất kỳ.

## Kiểm thử

```powershell
cd frontend
npm test
```

6 unit tests: escape, ảnh an toàn, tổng giỏ, quyền/chuyển trạng thái đơn.

E2E tùy chọn `node test/e2e.mjs`: cần backend đã `npm ci`, MySQL test local có quyền tạo/xóa database test, Chrome và Playwright. Có thể đặt `PLAYWRIGHT_MODULE` đến thư mục Playwright đã cài; TEST_DB_HOST/PORT/USER/PASSWORD cho server test. Script chỉ tạo database tên ngẫu nhiên `linh_ui_test_<16 hex>` của chính lần chạy, và dọn đúng DB đó trong finally. Không dùng DB nghiệp vụ; không chạy trên hạ tầng production. Cổng test 3017/5177 phải trống.

E2E dùng trình duyệt + API + DB thật, không mock dữ liệu nghiệp vụ; riêng ca mất phản hồi POS chặn một response sau commit để thử retry. Screenshot lưu thư mục tạm, hiển thị fixture có nhãn kiểm thử. Không dùng ảnh/test local làm bằng chứng nghiệm thu online.
