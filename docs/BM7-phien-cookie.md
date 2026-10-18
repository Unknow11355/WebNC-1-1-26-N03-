# BM7 — phiên trình duyệt trong cookie HttpOnly

Frontend gửi `X-Session-Mode: cookie` khi đăng nhập. Backend đặt cookie
`webnc_session`, không trả JWT trong JSON của chế độ này. Frontend không lưu
JWT trong localStorage/sessionStorage; khóa token cũ được xóa khi tải app.
Người dùng cần đăng nhập lại sau nâng cấp.

- HttpOnly; SameSite=Lax; Path=/api/v1; không Domain (host-only).
- Max-Age 3600 giây, JWT hết hạn sau 1 giờ; repository kiểm tra phiên chưa bị
  thu hồi và chưa hết hạn trong user_sessions.
- Mỗi đăng nhập tạo jti mới. Đăng nhập lại cùng tài khoản bằng cookie hợp lệ
  thu hồi phiên cũ sau khi xác minh mật khẩu; đăng nhập sai không thu hồi phiên.
- Logout thu hồi phiên ở DB và xóa cookie với cùng thuộc tính/path.
- Secure luôn bật trên Codespaces hoặc NODE_ENV=production. Local HTTP development
  không bật Secure; không dùng ảnh local để chứng minh Secure. HTTPS riêng ngoài
  Codespaces cần SESSION_COOKIE_SECURE=true.
- Postman/runner không gửi X-Session-Mode vẫn nhận Bearer JWT như trước.
- Yêu cầu thay đổi dữ liệu có cookie phải có Origin trong CORS_ORIGINS (bao gồm
  nguồn Codespaces được cấu hình tự động). Không suy ra nguồn tin cậy từ Host.
  Giữ kiểm tra nguồn để tránh làm yếu bảo vệ khi chuyển sang cookie tự động gửi.
  Không triển khai CSRF token, không đánh dấu BM3 hoàn tất.
- Frontend và API dùng proxy cùng origin. Không bật CORS credentials toàn cục.

## Kiểm chứng

Chạy `node --test test/session-cookie.test.js` tại backend. Bộ test dùng HTTP
thật và repository giả lập trong bộ nhớ: thuộc tính cookie, thời hạn JWT,
đăng nhập lại, thu hồi, token hết hạn, nguồn sai, và tương thích Bearer.
Đây không thay thế kiểm chứng DB/trình duyệt trên môi trường triển khai.

Sau triển khai, khởi động lại cả backend/frontend, đăng nhập lại trên HTTPS.
DevTools > Application > Cookies > tên miền 5173: tìm webnc_session.
Chụp Name, Domain, Path, Expires/Max-Age, HttpOnly, Secure, SameSite; che Value.
Kiểm tra sessionStorage không còn token. Tải lại web vẫn nhận diện người dùng;
kiểm tra báo cáo/upload theo quyền. Đăng xuất: cookie biến mất; tải lại trang
bảo vệ phải yêu cầu đăng nhập. Không đưa token/cookie vào ảnh hoặc Git.

Giữ các ảnh Session Storage cũ làm minh chứng trước thay đổi. Không dùng cookie
.Tunnels của hạ tầng làm minh chứng phiên ứng dụng.
