# Kết quả kiểm thử giao diện — 04/10/2026

Phạm vi: nhánh `Linh/giaodien/chucnanghienco`, frontend nối backend Buổi 6. Local Windows, Node.js 24.19.0, Chrome headless/Playwright, DB test tạo mới bằng schema + migration Buổi 4/5/6. Không phải chứng nhận bản online hoặc đủ mọi yêu cầu môn học.

## Kết quả đã chạy

- Backend ESLint: đạt; 45 tests: 45 đạt, 0 lỗi.
- Frontend core tests: 6 đạt, 0 lỗi (escape HTML, URL ảnh, trạng thái/quyền đơn, tổng giỏ).
- E2E `test/e2e.mjs`: 20 điểm kiểm tra dưới đây đạt; 0 lỗi JavaScript `pageerror`. API/DB thật, không dùng mock số liệu; riêng ca mất phản hồi POS cố ý chặn response sau khi server xử lý.

| STT | Điểm kiểm tra | Kết quả |
| --- | --- | --- |
| 1 | Danh sách public, 23 sản phẩm chia 20/3 theo server | Đạt |
| 2 | Tìm sản phẩm theo tên | Đạt |
| 3 | Khách login, thêm giỏ, checkout giao hàng, lịch sử đơn | Đạt |
| 4 | Nhân viên xác nhận/thu tiền; khách xác nhận nhận hàng | Đạt |
| 5 | Nhập kho qua UI; kiểm số tồn trong SQL | Đạt |
| 6 | Xuất lên kệ, kiểm kê qua UI; đối chiếu SQL | Đạt |
| 7 | POS cash; kiểm đơn offline paid trong SQL | Đạt |
| 8 | Admin mở quản lý sản phẩm | Đạt |
| 9 | Admin mở danh mục | Đạt |
| 10 | Admin mở quản lý nhân viên/khách | Đạt |
| 11 | Admin mở voucher | Đạt |
| 12 | Admin mở lịch sử kho | Đạt |
| 13 | Xem hồ sơ | Đạt |
| 14 | Tạo danh mục qua UI/API | Đạt |
| 15 | Sửa và xóa danh mục qua UI/API | Đạt |
| 16 | Tạo voucher qua UI/API | Đạt |
| 17 | Tạo sản phẩm và tìm lại theo mã | Đạt |
| 18 | Tạo tài khoản qua UI/API | Đạt |
| 19 | POS commit xong mất response; reload và retry cùng key | Đạt; chỉ thêm đúng 1 đơn |
| 20 | Mobile rộng 390px không tràn ngang toàn trang | Đạt |

Các screenshot desktop/mobile được tạo bởi script tại thư mục tạm in trong kết quả chạy. Đã xem bố cục desktop/mobile; sửa lỗi min-width của menu mobile tìm thấy trong lượt đầu. Fixture và database test được dọn sau mỗi lượt, không xóa/sửa DB nghiệp vụ của nhóm.

## Chưa xác nhận

- Triển khai HTTPS thật, các trình duyệt khác Chrome, máy in/quét mã camera.
- Kiểm thử WCAG/bảo mật đầy đủ, hiệu năng trên dữ liệu lớn.
- Toàn bộ tổ hợp chỉnh sửa/ngừng hoạt động tài khoản/sản phẩm/voucher và mọi dữ liệu biên chưa có E2E riêng; không suy từ màn hình mở được thành mọi thao tác đã được kiểm chứng.
- Báo cáo, audit, upload, ca làm, điểm và các module chưa có API nằm ngoài lần bàn giao frontend này.

Chạy lại được bằng lệnh trong [README](README.md); backend tests cũ không được trình bày như frontend E2E mới.
