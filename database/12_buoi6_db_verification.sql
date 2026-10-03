USE mini_supermarket;

-- Chỉ kiểm tra an toàn, không sửa dữ liệu.

SELECT VERSION() AS db_version;

SELECT
  'products.stock' AS invariant,
  COUNT(*) AS violations
FROM products
WHERE stock IS NULL OR stock < 0

UNION ALL
SELECT
  'inventory_items.stock',
  COUNT(*)
FROM inventory_items
WHERE stock IS NULL OR stock < 0

UNION ALL
SELECT
  'order_items.quantity > 0',
  COUNT(*)
FROM order_items
WHERE quantity IS NULL OR quantity <= 0

UNION ALL
SELECT
  'orders.money',
  COUNT(*)
FROM orders
WHERE total_amount IS NULL
   OR discount_amount IS NULL
   OR final_amount IS NULL
   OR total_amount < 0
   OR discount_amount < 0
   OR final_amount < 0
   OR discount_amount > total_amount
   OR final_amount > total_amount

UNION ALL
SELECT
  'payments.amount',
  COUNT(*)
FROM payments
WHERE amount IS NULL OR amount < 0;

SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  CONSTRAINT_TYPE
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
  AND TABLE_NAME IN (
    'products',
    'inventory_items',
    'order_items',
    'orders',
    'payments',
    'vouchers',
    'sale_requests'
  )
  AND (
    CONSTRAINT_TYPE = 'CHECK'
    OR CONSTRAINT_NAME LIKE 'uq_sale_requests%'
  )
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

SHOW CREATE TABLE sale_requests;
SHOW CREATE TABLE products;
SHOW CREATE TABLE orders;
