USE mini_supermarket;

-- Chạy trên DB test sau migration + seed. Kết quả EXPLAIN phải được lưu cùng commit/bằng chứng.

EXPLAIN
SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit, p.stock, p.category_id, p.image_url
FROM products p
WHERE p.status = 'active'
  AND p.category_id = (SELECT category_id FROM categories WHERE category_name = 'Buoi 7 Test' LIMIT 1)
  AND p.price BETWEEN 10000 AND 50000
  AND p.stock > 0
ORDER BY p.price ASC, p.product_id ASC
LIMIT 20 OFFSET 0;

EXPLAIN
SELECT COUNT(*) AS total
FROM products p
WHERE p.status = 'active'
  AND p.category_id = (SELECT category_id FROM categories WHERE category_name = 'Buoi 7 Test' LIMIT 1)
  AND p.price BETWEEN 10000 AND 50000
  AND p.stock > 0;

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
  AND o.paid_at < '2026-10-02 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL;

EXPLAIN
SELECT oi.product_id,
       SUM(oi.quantity) AS quantity,
       SUM(oi.quantity * oi.price) AS line_sales
FROM order_items oi
INNER JOIN orders o ON o.order_id = oi.order_id
WHERE o.payment_status = 'paid'
  AND o.paid_at >= '2026-10-01 00:00:00'
  AND o.paid_at < '2026-10-02 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
GROUP BY oi.product_id;


-- R3: doanh thu nhân viên; LEFT JOIN giữ đơn lịch sử dù nhân viên inactive/không còn tham chiếu.
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
  AND o.paid_at < '2026-10-02 00:00:00'
  AND o.status NOT IN ('cancelled', 'rejected')
  AND o.paid_at IS NOT NULL
GROUP BY o.employee_id, u.full_name
ORDER BY revenue DESC, o.employee_id ASC;
