# Buổi 6 – Phần Vinh (V2/V3)

## Khung thuật toán và phạm vi đã triển khai

Theo Mục 6.1 của tài liệu hướng dẫn kỹ thuật, đề tài siêu thị/bán lẻ sử dụng **T2 – Chống trừ trùng và bảo toàn số lượng** làm khung thuật toán chính; T3 và T5 là các khung kết hợp cho quản lý trạng thái và báo cáo. Flow POS cash trong phần Vinh tập trung triển khai T2.

## Phạm vi đã triển khai

Buổi 6 tiếp tục từ nền `Linh/v1/buoi6`, trong đó checklist phân công Vinh phụ trách V2 – Dữ liệu và V3 – Nghiệp vụ.

### V2 – Dữ liệu

- `database/10_buoi6_migration.sql`
  - Kiểm tra dữ liệu hiện có trước khi thêm ràng buộc.
  - Thêm `CHECK` cho tồn kho, quantity và các giá trị tiền.
  - Siết `NOT NULL` cho `orders.discount_amount`, `vouchers.min_order_amount`, `vouchers.used_count`.
  - Tạo `sale_requests` để chống xử lý POS cash lặp.
  - `UNIQUE(actor_id, operation, request_key)` và index theo `order_id`.
- `database/11_buoi6_seed.sql`
  - 10 sản phẩm fixture.
  - Có sản phẩm hết hàng và sản phẩm inactive.
  - `B6-POS-001` có tồn kệ 10 để kiểm thử 50 yêu cầu đồng thời.
- `database/12_buoi6_db_verification.sql`
  - Chỉ đọc để kiểm tra phiên bản DB, vi phạm bất biến và constraint đã tồn tại.

## V3 – Nghiệp vụ POS cash

Endpoint:
`POST /api/v1/pos/sales`

Header bắt buộc:
`Idempotency-Key: <1-64 ký tự A-Z/a-z/0-9/_/->`

Request tối thiểu:

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 }
  ],
  "customer_id": null,
  "payment_method": "cash",
  "note": "Bán tại quầy"
}
```

Server tự lấy employee_id từ `req.auth`, lấy giá từ database và không nhận `total_amount`, `price`, `paid`, `status` hoặc employee_id từ client.

### Thuật toán transaction

1. Kiểm tra employee/admin và Idempotency-Key.
2. Gộp các dòng trùng `product_id`.
3. Chuẩn hóa payload và hash bằng SHA-256.
4. `BEGIN`.
5. Ghi `sale_requests`; nếu trùng key thì transaction hiện tại rollback và xử lý replay ở connection mới.
6. Khóa từng sản phẩm theo `product_id` tăng dần bằng `FOR UPDATE`.
7. Kiểm tra active, tồn và lấy giá server.
8. Tạo order offline `completed`, payment `cash/paid`.
9. Giảm `products.stock` bằng UPDATE có điều kiện.
10. Ghi `order_items`.
11. Cập nhật `sale_requests.order_id`.
12. `COMMIT`.
13. Lỗi trước commit: rollback; transaction manager luôn release connection.

POS cash không tự sử dụng voucher/điểm trong phiên bản Buổi 6 tối thiểu; các trường client truyền vào sẽ bị từ chối rõ bằng 422 thay vì bỏ qua.

## Chống request lặp

Một key được gắn với actor + operation + request hash.

- Cùng actor + cùng key + cùng payload: trả lại đơn đã tạo, HTTP 200.
- Cùng actor + cùng key + payload khác: `409 KEY_REUSE_CONFLICT`.
- Giao dịch đầu rollback: bản ghi `sale_requests` cũng rollback, request mới có thể tạo lại.
- Chỉ tạo đơn sau khi request key đã được ghi trong cùng transaction.
- Không trả `request_hash` cho client.

## Thứ tự khóa

POS khóa product theo `product_id` tăng dần. Mục tiêu là tất cả các sản phẩm trong một sale được khóa theo cùng một thứ tự để tránh khóa ngược khi có nhiều request đồng thời.

Luồng POS không khóa voucher trước products vì phiên bản này không áp voucher/điểm.

## Fixture 50 request

`backend/requests/buoi6-pos-50.json` chứa 50 key khác nhau, cùng mua 1 sản phẩm fixture.

Kỳ vọng lý thuyết khi DB test có `B6-POS-001.stock = 10`: tối đa 10 sales thành công. Kết quả thực tế 50 request, timing, deadlock/timeout và dữ liệu trước/sau phải được Kiên chạy và ghi bằng chứng ở V4; tài liệu này không tự coi đó là kết quả đã kiểm chứng.

## Test tự động

`backend/test/pos.service.test.js` kiểm tra các trường hợp:
- gộp dòng trùng và thứ tự giảm tồn;
- không tin employee_id/tổng tiền từ client;
- chỉ cho cash;
- thiếu tồn;
- replay cùng key;
- đổi payload với cùng key;
- key không hợp lệ;
- kiểm quyền employee/admin;
- sản phẩm inactive.

## Bàn giao

Kiên tiếp tục kiểm thử 50 request đồng thời, SQL vi phạm trên DB test, rollback và chạy online. Flow POS cash được triển khai theo khung T2; T3/T5 không được đưa thêm vào flow POS chỉ để hoàn thành mã thuật toán mà chỉ áp dụng cho các nghiệp vụ tương ứng.
