-- Buổi 9 Vinh V2/V3 — EXPLAIN trước/sau tối ưu.
-- Chọn đúng database benchmark trước khi chạy.
-- BEFORE: chạy phần 1 trước migration index.
-- AFTER: chạy phần 2 sau migration index.
-- Các tham số dùng cùng fixture để so sánh công bằng.

-- ============================================================
-- 1. BEFORE OPTIMIZATION
-- ============================================================

-- B1. Products list: no B09-only index yet.
EXPLAIN
SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit, p.stock, p.category_id, p.image_url
FROM products p
WHERE p.status = 'active'
  AND p.category_id = 1
  AND p.price BETWEEN 10000 AND 80000
  AND p.stock > 0
ORDER BY p.price ASC, p.product_id ASC
LIMIT 20 OFFSET 0;

-- B2. Revenue report: original derived-table payment check.
EXPLAIN
SELECT COUNT(*) AS order_count,
       COALESCE(SUM(o.final_amount), 0) AS revenue,
       COALESCE(SUM(o.discount_amount), 0) AS discount_amount
FROM orders o
INNER JOIN (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM payments
  WHERE status = 'paid'
  GROUP BY order_id
) p ON p.order_id = o.order_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL;

-- B3. Product report: same SQL; the post-migration index changes access path.
EXPLAIN
SELECT p.product_id,
       p.product_name,
       p.barcode,
       COALESCE(SUM(oi.quantity), 0) AS quantity,
       COALESCE(SUM(oi.quantity * oi.price), 0) AS line_sales
FROM order_items oi
INNER JOIN orders o ON o.order_id = oi.order_id
INNER JOIN products p ON p.product_id = oi.product_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
GROUP BY p.product_id, p.product_name, p.barcode
ORDER BY line_sales DESC, p.product_id ASC;

-- B4. Employee report: original derived-table payment check.
EXPLAIN
SELECT o.employee_id,
       COALESCE(u.full_name, 'Chưa gán nhân viên') AS employee_name,
       COUNT(*) AS order_count,
       COALESCE(SUM(o.final_amount), 0) AS revenue
FROM orders o
LEFT JOIN users u ON u.user_id = o.employee_id
INNER JOIN (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM payments
  WHERE status = 'paid'
  GROUP BY order_id
) p ON p.order_id = o.order_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
GROUP BY o.employee_id, u.full_name
ORDER BY revenue DESC, o.employee_id ASC;

-- B5. Order list.
EXPLAIN
SELECT order_id, customer_id, order_type, delivery_method, total_amount,
       discount_amount, final_amount, payment_method, status, payment_status,
       order_status, created_at
FROM orders
WHERE status = 'completed'
ORDER BY created_at DESC, order_id DESC
LIMIT 20 OFFSET 0;


-- ============================================================
-- 2. AFTER OPTIMIZATION
-- ============================================================

-- A1. Same product query; compare type/key/rows after indexes.
EXPLAIN
SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit, p.stock, p.category_id, p.image_url
FROM products p
WHERE p.status = 'active'
  AND p.category_id = 1
  AND p.price BETWEEN 10000 AND 80000
  AND p.stock > 0
ORDER BY p.price ASC, p.product_id ASC
LIMIT 20 OFFSET 0;

-- A2. Revenue report: EXISTS avoids building/grouping the unused payment aggregate.
EXPLAIN
SELECT COUNT(*) AS order_count,
       COALESCE(SUM(o.final_amount), 0) AS revenue,
       COALESCE(SUM(o.discount_amount), 0) AS discount_amount
FROM orders o
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.order_id
      AND p.status = 'paid'
  );

-- A3. Same product report query; compare rows after order_items(order_id, ...).
EXPLAIN
SELECT p.product_id,
       p.product_name,
       p.barcode,
       COALESCE(SUM(oi.quantity), 0) AS quantity,
       COALESCE(SUM(oi.quantity * oi.price), 0) AS line_sales
FROM order_items oi
INNER JOIN orders o ON o.order_id = oi.order_id
INNER JOIN products p ON p.product_id = oi.product_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
GROUP BY p.product_id, p.product_name, p.barcode
ORDER BY line_sales DESC, p.product_id ASC;

-- A4. Employee report: EXISTS + payment index.
EXPLAIN
SELECT o.employee_id,
       COALESCE(u.full_name, 'Chưa gán nhân viên') AS employee_name,
       COUNT(*) AS order_count,
       COALESCE(SUM(o.final_amount), 0) AS revenue
FROM orders o
LEFT JOIN users u ON u.user_id = o.employee_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-16 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.order_id
      AND p.status = 'paid'
  )
GROUP BY o.employee_id, u.full_name
ORDER BY revenue DESC, o.employee_id ASC;

-- A5. Same order-list query; compare use of idx_b9_orders_status_created_id.
EXPLAIN
SELECT order_id, customer_id, order_type, delivery_method, total_amount,
       discount_amount, final_amount, payment_method, status, payment_status,
       order_status, created_at
FROM orders
WHERE status = 'completed'
ORDER BY created_at DESC, order_id DESC
LIMIT 20 OFFSET 0;
