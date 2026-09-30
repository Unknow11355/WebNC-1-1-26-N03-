# Buổi 4 — Phần Vinh (V2 + V3)


## Phần đã chuẩn bị

- `user.repository.js`: tìm tài khoản cho auth nội bộ, tìm user theo ID, lấy role, tạo customer, liệt kê user không lộ hash.
- `cart.repository.js`: tạo/đọc cart và đọc cart item.
- `cart.service.js`: kiểm tra danh tính, trạng thái tài khoản, role customer và ownership.
- `cart.controller.js`: controller HTTP cho POST/GET cart.
- `cart.routes.js`: route factory chờ middleware xác thực của Kiên.
- `cart.service.test.js`: kiểm thử A tạo/đọc, B truy cập chéo, duplicate cart, role và ID không hợp lệ.
- `03_buoi4_auth_schema.sql`: chuyển backend mới sang dùng `password_hash` làm nguồn chính.
- `04_buoi4_seed.sql`: 4 tài khoản demo phục vụ nghiệm thu.

## Tích hợp vào repo nhóm

Các file repository/service/controller/route/test được đặt theo đúng cấu trúc backend hiện tại.

`cart.routes.js` chưa tự nối vào `app.js/server.js` vì nhánh nền hiện tại chưa có middleware auth chính thức. Kiên cần cung cấp:

```js
requireAuth(req, res, next)
requireRole('customer')
```

và middleware phải gán:

```js
req.auth = { userId, role }
```

Sau đó Linh/Kiên có thể nối route vào bộ `createRoutes` hiện tại.

## Kiểm thử local

Trong `backend`:

```powershell
npm ci
npm run format
npm run check
```

Các test của Vinh không cần database thật. Kiểm thử SQL thật cần chạy trên MySQL theo hai file SQL và checklist nghiệm thu.

## Kiểm thử database

Thứ tự:

1. Reset database bằng file reset của nhóm nếu đang ở môi trường test.
2. Chạy schema Buổi 3 đã chốt.
3. Chạy `database/03_buoi4_auth_schema.sql`.
4. Kiểm tra `users_missing_password_hash`; cần là `0` trước khi bật NOT NULL.
5. Chạy `database/04_buoi4_seed.sql`.
6. Kiểm tra Customer A/B chưa có cart:
   ```sql
   SELECT u.user_id, u.email, c.cart_id
   FROM users u
   LEFT JOIN carts c ON c.user_id = u.user_id
   WHERE u.email IN ('customer.a@mini.local', 'customer.b@mini.local');
   ```
7. Sau khi Kiên tích hợp auth, chạy B4-02 → B4-13 theo checklist.

## Luật ownership

Client không được quyết định owner của cart.

Đúng:

```text
JWT / auth middleware
       ↓
req.auth.userId
       ↓
cart.service
       ↓
cartRepository.findById(cartId)
       ↓
so sánh cart.user_id === req.auth.userId
```

Không dùng `req.body.user_id` để xác định chủ giỏ.

## Git

Tên nhánh đề xuất:

```text
Vinh/v2-v3/buoi4
```

Commit đề xuất:

```text
feat: implement buoi4 user and cart data access
feat: implement cart ownership sample
test: add cart ownership service tests
docs: add vinh buoi4 handover notes
```
