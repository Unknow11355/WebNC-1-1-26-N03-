# Chạy trên GitHub Codespaces

1. Repo → Code → Codespaces → Create codespace on main. Chọn cấu hình `Nhom03 - Web va database` nếu được hỏi. Codespaces sử dụng hạn mức/tài nguyên của tài khoản GitHub; xem hạn mức trước khi tạo.
2. Chờ postCreateCommand hoàn tất, có dòng Ready. Môi trường có Node 24 + MariaDB 10.11 (tương thích giao thức MySQL), tự cài backend, chạy migration đến Buổi 7/CN09, tạo 3 tài khoản demo và 2 sản phẩm giả.
3. Terminal thứ nhất, từ gốc repo: `cd backend && npm start`.
4. Terminal thứ hai, từ gốc repo: `cd frontend && npm start`.
5. Tab Ports → cổng 5173 → Open in Browser. **Giữ Private**. Không public cổng 3000/3306. Frontend chuyển tiếp API nội bộ, không sửa API sang URL database hoặc máy Windows.

Tài khoản: admin.nhom03@demo.local / employee.nhom03@demo.local / customer.nhom03@demo.local; mật khẩu chung **Nhom03@Demo2026!**. Chỉ dùng demo, không đưa public/production. Mỗi Codespace có database riêng, không dùng chung DB trên máy Linh.

Không cần XAMPP, Workbench hoặc npm.cmd (Codespaces chạy Linux, dùng npm). JWT_SECRET sinh ngẫu nhiên trong .env không được commit. Password database Compose là mật khẩu dev công khai; database không publish cổng ra host. Dữ liệu nằm trong Docker volume; đừng chạy docker compose down -v. Xóa Codespace có thể mất dữ liệu, cần export riêng trước.

Nếu đã có Codespace trước khi thêm cấu hình: cập nhật main rồi Command Palette → Codespaces: Rebuild Container. Migrations có bảng đánh dấu; chạy lại không reset dữ liệu, không reset tài khoản. Nếu setup bị gián đoạn, chạy `cd backend && npm ci && node scripts/setup-codespaces.js` trong container này. Nếu migration báo dữ liệu sai, dừng và kiểm tra, không xóa DB để che lỗi.

Khi dùng xong chọn Stop codespace để ngừng chạy. Đây là môi trường phát triển/demo, không phải hosting production.

Kiểm tra tại máy phát triển: cấu hình Compose, cú pháp JavaScript và script khởi tạo trên database test riêng. Chưa xác nhận build end-to-end trên GitHub Codespaces; cần kiểm tra lần tạo đầu tiên. Nếu lỗi, gửi phần Creation log/postCreateCommand (không gửi token/secrets).
