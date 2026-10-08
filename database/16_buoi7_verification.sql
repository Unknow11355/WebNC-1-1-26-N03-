USE mini_supermarket;

-- Verification Buổi 7 V2/V3 của Vinh.
-- Chỉ đọc dữ liệu; chạy sau 13 migration + 14 seed trên DB TEST.

-- R1: 2 paid orders trong ngày 2026-10-01, tổng final_amount=140000, discount=10000.
SELECT
  CASE WHEN COUNT(*) = 2
            AND COALESCE(SUM(final_amount), 0) = 140000
            AND COALESCE(SUM(discount_amount), 0) = 10000
       THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*) AS paid_orders,
  COALESCE(SUM(final_amount), 0) AS revenue,
  COALESCE(SUM(discount_amount), 0) AS discount_amount
FROM orders
WHERE note IN ('B7_FIXTURE_PAID_A','B7_FIXTURE_PAID_B');

-- R2 P1/P2: giá dòng lịch sử, không dùng giá hiện tại của products.
SELECT
  'R2_P1' AS report,
  CASE WHEN COALESCE(SUM(oi.quantity),0) = 3
            AND COALESCE(SUM(oi.quantity * oi.price),0) = 110000
       THEN 'PASS' ELSE 'FAIL' END AS result,
  COALESCE(SUM(oi.quantity),0) AS quantity,
  COALESCE(SUM(oi.quantity * oi.price),0) AS line_sales
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
WHERE oi.product_id = (SELECT product_id FROM products WHERE barcode='B7-REP-001' LIMIT 1)
  AND o.note IN ('B7_FIXTURE_PAID_A','B7_FIXTURE_PAID_B');

SELECT
  'R2_P2' AS report,
  CASE WHEN COALESCE(SUM(oi.quantity),0) = 1
            AND COALESCE(SUM(oi.quantity * oi.price),0) = 40000
       THEN 'PASS' ELSE 'FAIL' END AS result,
  COALESCE(SUM(oi.quantity),0) AS quantity,
  COALESCE(SUM(oi.quantity * oi.price),0) AS line_sales
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
WHERE oi.product_id = (SELECT product_id FROM products WHERE barcode='B7-REP-002' LIMIT 1)
  AND o.note = 'B7_FIXTURE_PAID_A';

-- R3: A thu bởi E1, B thu bởi E2; đơn không gán employee vẫn được group riêng ở API nếu phát sinh.
SELECT employee_id,
       CASE
         WHEN employee_id = (SELECT user_id FROM users WHERE email='employee.b5@mini.local' LIMIT 1)
              AND COUNT(*) = 1 AND SUM(final_amount) = 90000 THEN 'PASS'
         WHEN employee_id = (SELECT user_id FROM users WHERE email='employee.b7@mini.local' LIMIT 1)
              AND COUNT(*) = 1 AND SUM(final_amount) = 50000 THEN 'PASS'
         ELSE 'FAIL'
       END AS result,
       COUNT(*) AS order_count,
       SUM(final_amount) AS revenue
FROM orders
WHERE note IN ('B7_FIXTURE_PAID_A','B7_FIXTURE_PAID_B')
GROUP BY employee_id
ORDER BY employee_id;

-- Biên thời gian và chất lượng dữ liệu fixture.
SELECT
  CASE WHEN COUNT(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*) AS paid_in_day
FROM orders
WHERE payment_status='paid'
  AND paid_at >= '2026-10-01 00:00:00'
  AND paid_at < '2026-10-02 00:00:00'
  AND note LIKE 'B7_FIXTURE_%';

SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*) AS paid_missing_paid_at
FROM orders
WHERE payment_status='paid' AND paid_at IS NULL;

-- Dataset pagination: ít nhất 70 fixture rows và phải có tên trùng thực sự.
SELECT
  CASE WHEN COUNT(*) >= 70 AND COUNT(DISTINCT product_name) < COUNT(*) THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*) AS fixture_products,
  COUNT(DISTINCT product_name) AS distinct_names
FROM products
WHERE barcode LIKE 'B7-PAGE-%';

-- Migration/schema: các cột và index bắt buộc của K8/K9/V2.
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND TABLE_NAME IN ('audit_logs','notifications','password_reset_tokens')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SHOW INDEX FROM audit_logs;
SHOW INDEX FROM notifications;
SHOW INDEX FROM password_reset_tokens;
SHOW INDEX FROM products;
SHOW INDEX FROM orders;
SHOW INDEX FROM order_items;

-- Không log mật khẩu/token/OTP/full request body: kiểm tra tên cột audit chỉ ở metadata tối thiểu.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*) AS forbidden_named_columns
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs'
  AND LOWER(column_name) IN ('password','token','otp','request_body','body');


-- R3: tài khoản nhận doanh thu phải là employee, không dùng admin làm employee fixture.
SELECT 'R3_ROLE_CHECK' AS check_name,
       CASE WHEN COUNT(*) = 2 AND SUM(CASE WHEN r.role_name = 'employee' THEN 1 ELSE 0 END) = 2
            THEN 'PASS' ELSE 'FAIL' END AS result,
       COUNT(*) AS fixture_employee_rows
FROM orders o
JOIN users u ON u.user_id = o.employee_id
JOIN roles r ON r.role_id = u.role_id
WHERE o.note IN ('B7_FIXTURE_PAID_A','B7_FIXTURE_PAID_B');

-- Pagination fixture phải có tên trùng thật, không chỉ có phần hậu tố giống nhau.
SELECT 'PAGINATION_DUPLICATE_NAME' AS check_name,
       CASE WHEN COUNT(*) >= 70 AND COUNT(DISTINCT product_name) < COUNT(*)
            THEN 'PASS' ELSE 'FAIL' END AS result,
       COUNT(*) AS fixture_products,
       COUNT(DISTINCT product_name) AS distinct_names
FROM products
WHERE barcode LIKE 'B7-PAGE-%';
