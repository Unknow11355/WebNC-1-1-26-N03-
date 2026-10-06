# CN02 — Cập nhật hồ sơ cá nhân

Ngày: 06/10/2026. Nhánh `Linh/chucnang/capnhathoso`, nền main sau `phancong13chucnang`.

## Chức năng

Tài khoản → sửa họ tên, điện thoại, địa chỉ → Lưu hồ sơ. Tên trên thanh điều hướng cập nhật ngay; tải lại trang vẫn giữ dữ liệu từ database. Áp dụng cho tài khoản active ở cả ba vai trò. Không cần migration mới.

`PATCH /api/v1/auth/me`, Bearer JWT bắt buộc. Controller lấy userId từ middleware, không nhận ID tài khoản trong URL/body. Service chỉ chấp nhận full_name, phone, address; repository dùng SQL tham số hóa hiện có. Schema/OpenAPI riêng cho endpoint tại `docs/profile.openapi.json` (không thay toàn bộ đặc tả của nhóm).

- full_name: chuỗi sau trim dài 2–100, không null.
- phone: tùy chọn, null/chuỗi trống để xóa; 8–15 chữ số, có thể bắt đầu bằng +. Không bắt người dùng đổi email hoặc mật khẩu để sửa hồ sơ.
- address: tùy chọn, null/chuỗi trống để xóa; tối đa 255 ký tự.
- Bỏ qua trường không gửi, nhưng **từ chối** trường không được phép (user_id, role_name, role_id, status, email, password, points…).
- 200: hồ sơ mới, không trả password/hash. 400: body/ràng buộc sai. 401: thiếu/sai/hết phiên hoặc tài khoản không active. 409: điện thoại không khả dụng. Không đưa tên tài khoản đang dùng số điện thoại hoặc SQL vào lỗi.

## Kiểm thử đã chạy local

- Backend: 51/51 test đạt (6 test mới cho CN02), ESLint được chạy riêng.
- E2E Chrome + API + MySQL test thật: 21 điểm kiểm tra đạt, 0 pageerror; gồm sửa hồ sơ trên UI, reload giữ dữ liệu, giả user_id/role trả 400, thiếu JWT trả 401, tài khoản khác không đổi, quyền không tăng. Các luồng mua hàng/kho/POS cũ vẫn đạt.
- Không coi kiểm tra viewport 390px là bằng chứng chạy trên điện thoại thật.

## Bản demo điện thoại qua USB

Script `backend/scripts/phone-demo.js` tạo **database demo riêng với tên ngẫu nhiên**, seed tài khoản demo và 4 sản phẩm, khởi động API 3000 + frontend 5173. Chỉ chạy khi hai cổng trống và database local cho phép tạo DB test. Chạy từ backend: `node scripts/phone-demo.js`. Có thể đặt TEST_DB_HOST/PORT/USER/PASSWORD. Mật khẩu demo sinh ngẫu nhiên và in ở terminal, không ghi vào repository.

Database demo được giữ khi dừng để không mất hồ sơ người dùng vừa sửa. Mỗi lần chạy tạo bản demo mới; không dùng lại hoặc reset database nhóm. Dừng tiến trình bằng Ctrl+C. Khi cần dùng dữ liệu thật của nhóm, chạy backend theo README thay vì script demo.

Điện thoại Android đã bật USB debugging và cấp quyền cho máy tính. Kết nối chuyển tiếp:

```powershell
& 'C:\Android\sdk\platform-tools\adb.exe' -s 11c647740920 reverse tcp:5173 tcp:5173
```

Mở Chrome trên điện thoại: `http://127.0.0.1:5173/#profile`. Đăng nhập demo theo terminal → Tài khoản → sửa thông tin → Lưu hồ sơ.

Trạng thái thực tế: ADB nhận Redmi 9 Power (M2010J19SI) ở trạng thái device; bản demo local đã chạy. Công cụ bị chặn khi thực hiện lệnh reverse/mở trình duyệt/chụp màn hình, nên **chưa xác nhận được giao diện trên thiết bị thật**. Người dùng cần thực hiện bước reverse và mở URL; không ghi đã test điện thoại thành công.

Sau khi dùng xong có thể gỡ chuyển tiếp bằng `adb -s 11c647740920 reverse --remove tcp:5173`. Không có thay đổi cài đặt mạng Wi-Fi hoặc cài app lên điện thoại trong lần này.
