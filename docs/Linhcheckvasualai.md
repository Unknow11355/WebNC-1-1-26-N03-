# Linh rà soát và sửa Buổi 5 — nhánh Vinh/v2-v3/buoi5

## Các lỗi đã sửa

1. Checkout: ánh xạ `product_id` sang `productId` đúng hợp đồng repository; tránh tham số SQL undefined khi ghi order_items.
2. Nhập kho: tăng tồn và cập nhật giá nhập mới nhất trong cùng câu UPDATE, cùng transaction với nhật ký.
3. Kiến trúc: chuyển SELECT giỏ có FOR UPDATE từ service sang order repository; giữ nguyên connection transaction.
4. Kiểm kê: từ chối null, chuỗi rỗng, boolean, mảng, object và số lượng không phải số nguyên an toàn; không vô tình đổi tồn về 0. Số 0 hợp lệ vẫn được chấp nhận.
5. Tạo sản phẩm: truyền stock = 0 đến repository; client không được tự đặt tồn kệ bằng API tạo thông tin sản phẩm. Tồn tăng qua nghiệp vụ chuyển kho lên kệ.

Không đổi luồng trạng thái delivery/pickup hoặc gộp trạng thái thanh toán với trạng thái đơn.

## Kiểm chứng

- `npm run check`: lint, Prettier và 36 test tự động đạt.
- `npm run test:buoi5:db`: 12 ca nghiệp vụ tích hợp đạt (Node báo 13 tests vì tính cả test cha).
- Môi trường kiểm tra: Windows, Node 26.1.0, MariaDB local. Đây là kiểm chứng service + repository + transaction + schema thật; không phải minh chứng HTTP/online hoặc chứng nhận chạy trên MySQL production.
- Các ca DB: nhập kho/giá nhập/log; validation kiểm kê; xuất kho tạo sản phẩm; chặn thiếu tồn; rollback nhập kho khi lỗi FK; checkout nhiều bảng; quyền chủ đơn và delivery/thu tiền; rollback checkout sau khi đã ghi payment và xóa giỏ; reject chỉ hoàn tồn một lần; giỏ rỗng; CRUD sản phẩm tồn 0; voucher giảm tiền và hoàn lượt đúng một lần.
- Test sử dụng database tạm tên ngẫu nhiên `linh_b5_test_<hex>`, tạo schema từ 01_schema.sql và fixture riêng. Không dùng/reset mini_supermarket. Database tạm được xóa trong finally, chỉ chứa dữ liệu test có thể tái tạo.

## Cách chạy lại

Trong thư mục backend:

```sh
npm ci
npm run check
npm run test:buoi5:db
```

Lệnh DB chạy riêng, không ép người chạy unit test phải có database. Cần tài khoản database local/test có quyền CREATE/DROP DATABASE. Cấu hình bằng TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD; mặc định 127.0.0.1:3306, root, mật khẩu rỗng dành cho XAMPP local. Không dùng tài khoản production.

## Chưa được xác nhận hoàn thành toàn Buổi 5

- Vinh cần kiểm chứng chuỗi migration/seed đầy đủ, đo P50 bằng script đã có và cập nhật OpenAPI theo API thực tế.
- Kiên cần kiểm thử HTTP tích hợp với đăng nhập thật, cạnh tranh đồng thời, triển khai online, chụp minh chứng và hoàn thiện báo cáo 4.1–4.3.
- Linh rà soát bằng chứng bàn giao; không đánh dấu toàn buổi đạt chỉ dựa vào test local này.
