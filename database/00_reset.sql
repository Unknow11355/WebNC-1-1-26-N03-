USE mini_supermarket;

-- Bắt buộc phải chạy cùng lúc trong 1 ô SQL
SET FOREIGN_KEY_CHECKS = 0;

-- 3 bảng mới
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sale_requests;
DROP TABLE IF EXISTS user_sessions;

-- Các bảng từ Buổi 1-4
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_vouchers;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_discounts;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS employee_day_overrides;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS work_shifts;
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS vouchers;
DROP TABLE IF EXISTS discount_codes;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;