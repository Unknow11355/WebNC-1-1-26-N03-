# Tài khoản demo dùng chung cho nhóm 03

Chỉ dùng local với dữ liệu giả. Mật khẩu trong tài liệu này công khai; tuyệt đối không dùng trên website online/production. GitHub chứa script, không chứa database hay tài khoản thật. Mỗi bạn cần chạy script trên database riêng của mình.

Sau khi cập nhật main, cài backend bằng `npm.cmd ci`, chuẩn bị database/migration đến CN09 và cấu hình `backend/.env`:

```dotenv
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mini_supermarket
```

Sửa cổng, user, password cho đúng máy; giữ JWT_SECRET riêng của mỗi máy. Không ghi đè .env đã có, không commit .env.

Từ thư mục gốc repository:

```powershell
cd backend
node scripts/create-demo-accounts.js --shared
npm.cmd start
```

Terminal thứ hai, từ thư mục gốc:

```powershell
cd frontend
npm.cmd start
```

Mở http://localhost:5173 và dùng:

| Vai trò | Email | Mật khẩu demo công khai |
| --- | --- | --- |
| Admin | admin.nhom03@demo.local | Nhom03@Demo2026! |
| Nhân viên | employee.nhom03@demo.local | Nhom03@Demo2026! |
| Khách hàng | customer.nhom03@demo.local | Nhom03@Demo2026! |

Script hash bcrypt trước khi lưu, tạo cả ba trong một transaction, không xóa dữ liệu. Chạy lại sẽ bỏ qua email đã tồn tại, không đổi mật khẩu/quyền; vì vậy nếu đã tự đổi mật khẩu thì mật khẩu mới vẫn giữ nguyên. Các tài khoản `*.linh@demo.local` trước đây không bị thay đổi.

Nếu thiếu bảng/cột: database mới chạy 01_schema.sql → 03_buoi4_auth_schema.sql → 05_buoi5_migration.sql → 10_buoi6_migration.sql; chọn mini_supermarket rồi chạy cn09_shift_end.sql một lần. Với DB đang có dữ liệu, sao lưu và chỉ chạy migration còn thiếu. Không chạy 00_reset.sql.

Trước khi phát hành online phải loại bỏ/khóa tài khoản demo hoặc thay mật khẩu riêng và thu hồi phiên đăng nhập; không đưa bản sao database local lên online nguyên trạng.
