# Sửa tiếng Việt trong dữ liệu danh mục local

Git không đồng bộ database. Script này sửa các chuỗi UTF-8 bị đọc nhầm Windows-1252 trong tên/mô tả/đơn vị sản phẩm, tên/đơn vị hàng kho và tên danh mục. Không sửa giá, tồn kho, ID hoặc tài khoản.

Trong thư mục backend, dùng cấu hình database local trong `.env`:

```sh
node scripts/repair-vietnamese-catalog.mjs
```

Lệnh trên chỉ xem trước. Kiểm tra nội dung trước/sau rồi mới áp dụng, chọn thư mục sao lưu ngoài repository:

```sh
node scripts/repair-vietnamese-catalog.mjs --apply --backup-dir=C:/database-backups
```

Script lưu JSON các giá trị cũ/mới trước cập nhật, cập nhật trong transaction và rollback nếu gặp lỗi. Không commit bản sao lưu vào Git. Chạy lại chế độ xem trước để kiểm tra còn thay đổi hay không, sau đó tải lại trang. Script chỉ xử lý chuỗi có thể khôi phục bằng phép chuyển mã xác định, không đoán hoặc viết lại tên sản phẩm.
