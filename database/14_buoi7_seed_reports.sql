USE mini_supermarket;

-- Fixture Buổi 7 dùng cho R1/R2/R3, pagination và truy vấn nhiều điều kiện.
INSERT IGNORE INTO categories(category_name) VALUES ('Buoi 7 Test');
SET @b7_cat := (SELECT category_id FROM categories WHERE category_name = 'Buoi 7 Test' LIMIT 1);
SET @b7_customer := (SELECT user_id FROM users WHERE email = 'customer.a.b5@mini.local' LIMIT 1);

-- Employee 2 riêng cho R3, không dùng tài khoản admin làm nhóm doanh thu nhân viên.
INSERT INTO users
(full_name, email, phone, password, password_hash, address, role_id, status, employment_type)
VALUES
('Employee Buoi 7', 'employee.b7@mini.local', '0910000112', '$2b$12$NZNQC9rS3ZiBqK1F/NNo5u0XBBLLpkNxj/oQEuDCqJlfRyVPKy/9u', '$2b$12$NZNQC9rS3ZiBqK1F/NNo5u0XBBLLpkNxj/oQEuDCqJlfRyVPKy/9u', 'Ha Noi', (SELECT role_id FROM roles WHERE role_name='employee'), 'active', 'full_time')
ON DUPLICATE KEY UPDATE status='active', role_id=VALUES(role_id), password_hash=VALUES(password_hash);
SET @b7_e1 := (SELECT user_id FROM users WHERE email = 'employee.b5@mini.local' LIMIT 1);
SET @b7_e2 := (SELECT user_id FROM users WHERE email = 'employee.b7@mini.local' LIMIT 1);

INSERT INTO products
(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES
('B7 Report Product 01', 'B7-REP-001', 'Fixture R1/R2', NULL, 30000, 'sp', 50, 5, @b7_cat, 'active'),
('B7 Report Product 02', 'B7-REP-002', 'Fixture R1/R2', NULL, 40000, 'sp', 50, 5, @b7_cat, 'active')
ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name),
  price = VALUES(price),
  category_id = VALUES(category_id),
  status = 'active';

SET @b7_p1 := (SELECT product_id FROM products WHERE barcode='B7-REP-001' LIMIT 1);
SET @b7_p2 := (SELECT product_id FROM products WHERE barcode='B7-REP-002' LIMIT 1);

-- Dataset > 3 trang (70 bản ghi), đồng thời có nhiều tên/giá trùng.
INSERT INTO products
(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL SELECT n + 1 FROM seq WHERE n < 70
)
SELECT
  CASE WHEN n IN (5, 10, 15) THEN 'B7 Page Duplicate Name' ELSE CONCAT('B7 Page Product ', LPAD(n, 3, '0')) END,
  CONCAT('B7-PAGE-', LPAD(n, 3, '0')),
  'Fixture pagination/sort',
  NULL,
  10000 + (n % 5) * 5000,
  'sp',
  CASE WHEN n % 11 = 0 THEN 0 ELSE 5 + (n % 10) END,
  2,
  @b7_cat,
  CASE WHEN n % 17 = 0 THEN 'inactive' ELSE 'active' END
FROM seq
ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name),
  price = VALUES(price),
  stock = VALUES(stock),
  category_id = VALUES(category_id),
  status = VALUES(status);

-- Xóa riêng order fixture cũ để script có thể chạy lại.
DELETE FROM orders WHERE note LIKE 'B7_FIXTURE_%';

-- A: final 90.000, discount 10.000, 2 dòng hàng; B: final 50.000, 1 dòng hàng.
INSERT INTO orders
(customer_id, employee_id, order_type, delivery_method, total_amount, discount_amount,
 points_used, points_earned, points_discount, final_amount, payment_method,
 status, payment_status, order_status, paid_at, note)
VALUES
(@b7_customer, @b7_e1, 'online', 'pickup', 100000, 10000, 0, 0, 0, 90000, 'cash',
 'completed', 'paid', 'completed', '2026-10-01 09:00:00', 'B7_FIXTURE_PAID_A'),
(@b7_customer, @b7_e2, 'online', 'pickup', 50000, 0, 0, 0, 0, 50000, 'cash',
 'completed', 'paid', 'completed', '2026-10-01 10:00:00', 'B7_FIXTURE_PAID_B'),
(@b7_customer, @b7_e1, 'online', 'pickup', 30000, 0, 0, 0, 0, 30000, 'cash',
 'pending', 'pending', 'pending', '2026-10-01 11:00:00', 'B7_FIXTURE_UNPAID'),
(@b7_customer, @b7_e1, 'online', 'pickup', 30000, 0, 0, 0, 0, 30000, 'cash',
 'cancelled', 'paid', 'cancelled', '2026-10-01 12:00:00', 'B7_FIXTURE_CANCELLED'),
(@b7_customer, @b7_e1, 'online', 'pickup', 20000, 0, 0, 0, 0, 20000, 'cash',
 'completed', 'paid', 'completed', '2026-09-30 12:00:00', 'B7_FIXTURE_OUTSIDE');

SET @b7_oA := (SELECT order_id FROM orders WHERE note='B7_FIXTURE_PAID_A' LIMIT 1);
SET @b7_oB := (SELECT order_id FROM orders WHERE note='B7_FIXTURE_PAID_B' LIMIT 1);
SET @b7_oU := (SELECT order_id FROM orders WHERE note='B7_FIXTURE_UNPAID' LIMIT 1);
SET @b7_oC := (SELECT order_id FROM orders WHERE note='B7_FIXTURE_CANCELLED' LIMIT 1);
SET @b7_oO := (SELECT order_id FROM orders WHERE note='B7_FIXTURE_OUTSIDE' LIMIT 1);

INSERT INTO order_items(order_id, product_id, quantity, price, subtotal)
VALUES
(@b7_oA, @b7_p1, 2, 30000, 60000),
(@b7_oA, @b7_p2, 1, 40000, 40000),
(@b7_oB, @b7_p1, 1, 50000, 50000),
(@b7_oU, @b7_p1, 1, 30000, 30000),
(@b7_oC, @b7_p1, 1, 30000, 30000),
(@b7_oO, @b7_p1, 1, 20000, 20000);

-- A có 2 payment rows để bắt lỗi nhân bản khi JOIN; tổng payment vẫn là 90.000.
INSERT INTO payments(order_id, method, amount, status, transaction_id, paid_at)
VALUES
(@b7_oA, 'cash', 60000, 'paid', 'B7-PAY-A-1', '2026-10-01 09:00:00'),
(@b7_oA, 'cash', 30000, 'paid', 'B7-PAY-A-2', '2026-10-01 09:00:01'),
(@b7_oB, 'cash', 50000, 'paid', 'B7-PAY-B-1', '2026-10-01 10:00:00'),
(@b7_oU, 'cash', 30000, 'pending', NULL, NULL),
(@b7_oC, 'cash', 30000, 'paid', 'B7-PAY-C-1', '2026-10-01 12:00:00'),
(@b7_oO, 'cash', 20000, 'paid', 'B7-PAY-O-1', '2026-09-30 12:00:00');
