# Buổi 5 — Hợp đồng Vinh V2/V3

Tài liệu này chốt cách V2/V3 nối vào nền `Linh/v1/buoi5`. Nó là hợp đồng tích hợp, không thay cho code và test.

## 1. Quy tắc ba tầng

`route → controller → service → repository → MySQL`.

Controller chỉ lấy `req.params`, `req.query`, `req.body`, `req.auth` và trả JSON/HTTP status. Service không nhận `req`/`res`; toàn bộ kiểm tra dữ liệu và nghiệp vụ nằm ở service. Repository chỉ SQL tham số hóa và nhận thêm executor khi chạy transaction.

## 2. Chữ ký repository đã chốt

Các hàm ghi/đọc có khả năng chạy trong transaction dùng mẫu:

```text
method(input, executor = db)
```

Khi service bắt đầu transaction:

```text
transactionManager.run(async (connection) => {
  repository_A.method(data, connection)
  repository_B.method(data, connection)
})
```

Không mở thêm pool/connection trong repository bên trong transaction.

## 3. Ranh giới transaction

Luồng nhập kho:

```text
BEGIN
  lock inventory_item
  update inventory_items.stock/import_price
  insert inventory_logs(import)
COMMIT
```

Luồng kho → kệ:

```text
BEGIN
  lock inventory_item
  lock/create product theo barcode
  decrease inventory_items.stock
  increase products.stock
  insert inventory_logs(export)
COMMIT
```

Checkout:

```text
BEGIN
  lock cart + cart_items/products
  lấy giá server
  lock voucher nếu có
  insert orders
  insert order_items
  create payment pending
  decrease products.stock
  increment voucher.used_count
  clear cart
COMMIT
```

Reject:

```text
BEGIN
  lock pending order
  lock order_items
  restore products.stock
  decrement voucher.used_count nếu đơn có voucher
  update order = rejected
COMMIT
```

Lỗi ở bất kỳ bước nào → rollback; connection luôn release.

## 4. Auth contract

`POST /api/v1/auth/login` cấp JWT HS256 có `userId` + `jti`. `user_sessions` lưu `jti`, user và thời hạn. Middleware kiểm tra chữ ký JWT, session còn hiệu lực và tài khoản còn `active`, sau đó đặt:

```text
req.auth = { userId, role }
req.sessionId = jti
```

Không nhận `employee_id` từ body để ghi log kho; service lấy `req.auth.userId`.

## 5. Tồn kho

`inventory_items.stock` = tồn kho.
`products.stock` = tồn kệ đang bán.

Không cộng hai cột khi nhập. Chuyển `q` đơn vị: kho `-q`, kệ `+q` trong cùng transaction.

## 6. CRUD đã chốt

| Thực thể | GET/list | GET/id | POST | PATCH | DELETE |
| --- | --- | --- | --- | --- | --- |
| categories | ✓ | — | ✓ | ✓ | ✓ |
| products | ✓ | ✓ | ✓ | ✓ | ✓ soft-delete |
| inventory/items | ✓ | ✓ | ✓ | ✓ | ✓ soft-delete |
| users | ✓ | ✓ | ✓ (admin) | ✓ (admin) | ✓ soft-delete |
| vouchers | ✓ (admin) | ✓ (admin) | ✓ (admin) | ✓ (admin) | ✓ soft-delete |
| carts | ✓ mine | ✓ owner | ✓ | PATCH item | DELETE item |
| orders | mine/all | ✓ | checkout | status/payment | — |

`order_items`, `payments`, `inventory_logs` là dữ liệu phát sinh từ nghiệp vụ nên không cho client CRUD tự do.

## 7. Phân quyền

- Public: đọc sản phẩm; đăng ký; đăng nhập.
- Customer: cart, checkout, đơn của chính mình, validate voucher, receive.
- Employee/Admin: inventory import/export/adjust, xem và xử lý đơn.
- Admin: CRUD danh mục/sản phẩm/mặt hàng kho/tài khoản/voucher.

Mọi API ghi đều kiểm quyền ở backend; service còn kiểm owner đối với cart/order.
