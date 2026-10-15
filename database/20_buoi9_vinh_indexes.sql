-- Buổi 9 Vinh V2/V3 — indexes for measured report/order queries.
-- Chọn database benchmark trước khi chạy, ví dụ:
--   USE mini_supermarket_buoi9_vinh;
-- Script KHÔNG reset database và chỉ thêm index nếu chưa tồn tại.

DROP PROCEDURE IF EXISTS add_b9_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_b9_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @b9_sql = p_sql;
    PREPARE b9_stmt FROM @b9_sql;
    EXECUTE b9_stmt;
    DEALLOCATE PREPARE b9_stmt;
  END IF;
END//
DELIMITER ;

-- R1/R3: report repositories now use EXISTS(payment.status='paid').
CALL add_b9_index_if_missing(
  'payments',
  'idx_b9_payments_status_order_amount',
  'ALTER TABLE payments ADD INDEX idx_b9_payments_status_order_amount (status, order_id, amount)'
);

-- R2: report by product filters orders by date, then joins order_items by order_id.
CALL add_b9_index_if_missing(
  'order_items',
  'idx_b9_order_product_qty_price',
  'ALTER TABLE order_items ADD INDEX idx_b9_order_product_qty_price (order_id, product_id, quantity, price)'
);

-- /orders?status=completed uses status + newest-first pagination.
CALL add_b9_index_if_missing(
  'orders',
  'idx_b9_orders_status_created_id',
  'ALTER TABLE orders ADD INDEX idx_b9_orders_status_created_id (status, created_at, order_id)'
);

DROP PROCEDURE add_b9_index_if_missing;
