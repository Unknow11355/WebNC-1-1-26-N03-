# Database hoan chinh — Buoi 3 + phan Buoi 4 cua Vinh

Database chinh van la `mini_supermarket` voi 23 bang theo SQL Buoi 3. Buoi 4 chi bo sung migration/auth seed, khong thay the schema 23 bang.

## Thu tu chay tren moi truong test

1. `00_reset.sql` — xoa sach database. Chi dung tren moi truong test.
2. `01_schema.sql` — tao day du 23 bang. File da sua thu tu de `vouchers` duoc tao truoc `orders`, vi `orders.voucher_id` co FK den `vouchers`.
3. `02_seed.sql` — seed du lieu Buoi 3.
4. `03_buoi4_auth_schema.sql` — cho phep backend Buoi 4 dung `password_hash`; giu `password` legacy tam thoi de khong pha code cu.
5. `04_buoi4_seed.sql` — them Admin/Employee/Customer A/Customer B phuc vu test auth va ownership.

## Kiem tra nhanh

```sql
SELECT DATABASE();
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'mini_supermarket';

SELECT role_id, role_name FROM roles ORDER BY role_id;

SELECT user_id, email, role_id, status
FROM users
ORDER BY user_id;

SELECT u.user_id, u.email, c.cart_id
FROM users u
LEFT JOIN carts c ON c.user_id = u.user_id
WHERE u.email IN ('customer.a@mini.local', 'customer.b@mini.local');
```

Ky vong sau khi chay day du: 23 bang; co ba role `customer`, `employee`, `admin`; co it nhat 4 tai khoan Buoi 4; Customer A/B chua co cart de chay ca tao cart.
