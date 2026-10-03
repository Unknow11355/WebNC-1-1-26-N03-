USE mini_supermarket;

-- Buổi 6 - V2: kiểm tra dữ liệu cũ trước khi siết ràng buộc.
DROP PROCEDURE IF EXISTS validate_buoi6_data;
DELIMITER //
CREATE PROCEDURE validate_buoi6_data()
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE stock IS NULL OR stock < 0) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'products.stock có NULL hoặc âm; dừng migration để không che dữ liệu lỗi';
  END IF;

  IF EXISTS (SELECT 1 FROM inventory_items WHERE stock IS NULL OR stock < 0) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'inventory_items.stock có NULL hoặc âm; dừng migration để không che dữ liệu lỗi';
  END IF;

  IF EXISTS (SELECT 1 FROM order_items WHERE quantity IS NULL OR quantity <= 0) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'order_items.quantity có NULL hoặc không dương; dừng migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM orders
    WHERE total_amount IS NULL
       OR discount_amount IS NULL
       OR final_amount IS NULL
       OR total_amount < 0
       OR discount_amount < 0
       OR final_amount < 0
       OR discount_amount > total_amount
       OR final_amount > total_amount
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'orders có giá trị tiền hoặc NULL không hợp lệ; dừng migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM order_items
    WHERE price IS NULL OR subtotal IS NULL OR price < 0 OR subtotal < 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'order_items có giá tiền hoặc NULL không hợp lệ; dừng migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM payments
    WHERE amount IS NULL OR amount < 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'payments.amount có NULL hoặc âm; dừng migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vouchers
    WHERE min_order_amount IS NULL
       OR used_count IS NULL
       OR min_order_amount < 0
       OR discount_value < 0
       OR (max_discount IS NOT NULL AND max_discount < 0)
       OR used_count < 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'vouchers có dữ liệu tiền/lượt dùng không hợp lệ; dừng migration';
  END IF;
END//
DELIMITER ;
CALL validate_buoi6_data();
DROP PROCEDURE validate_buoi6_data;

-- NOT NULL cho các trường mà V2 sử dụng như bất biến.
ALTER TABLE orders
  MODIFY discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE vouchers
  MODIFY min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  MODIFY used_count INT NOT NULL DEFAULT 0;

-- Thêm CHECK theo từng bảng, chỉ khi chưa tồn tại.
DROP PROCEDURE IF EXISTS add_check_if_missing;
DELIMITER //
CREATE PROCEDURE add_check_if_missing(
  IN p_table VARCHAR(64),
  IN p_name VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_name
  ) THEN
    SET @check_sql = p_sql;
    PREPARE stmt FROM @check_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_check_if_missing(
  'products',
  'ck_products_stock_nonnegative',
  'ALTER TABLE products ADD CONSTRAINT ck_products_stock_nonnegative CHECK (stock >= 0)'
);
CALL add_check_if_missing(
  'inventory_items',
  'ck_inventory_items_stock_nonnegative',
  'ALTER TABLE inventory_items ADD CONSTRAINT ck_inventory_items_stock_nonnegative CHECK (stock >= 0)'
);
CALL add_check_if_missing(
  'order_items',
  'ck_order_items_quantity_positive',
  'ALTER TABLE order_items ADD CONSTRAINT ck_order_items_quantity_positive CHECK (quantity > 0)'
);
CALL add_check_if_missing(
  'order_items',
  'ck_order_items_price_nonnegative',
  'ALTER TABLE order_items ADD CONSTRAINT ck_order_items_price_nonnegative CHECK (price >= 0)'
);
CALL add_check_if_missing(
  'order_items',
  'ck_order_items_subtotal_nonnegative',
  'ALTER TABLE order_items ADD CONSTRAINT ck_order_items_subtotal_nonnegative CHECK (subtotal >= 0)'
);
CALL add_check_if_missing(
  'orders',
  'ck_orders_total_nonnegative',
  'ALTER TABLE orders ADD CONSTRAINT ck_orders_total_nonnegative CHECK (total_amount >= 0)'
);
CALL add_check_if_missing(
  'orders',
  'ck_orders_discount_nonnegative',
  'ALTER TABLE orders ADD CONSTRAINT ck_orders_discount_nonnegative CHECK (discount_amount >= 0)'
);
CALL add_check_if_missing(
  'orders',
  'ck_orders_discount_le_total',
  'ALTER TABLE orders ADD CONSTRAINT ck_orders_discount_le_total CHECK (discount_amount <= total_amount)'
);
CALL add_check_if_missing(
  'orders',
  'ck_orders_final_nonnegative',
  'ALTER TABLE orders ADD CONSTRAINT ck_orders_final_nonnegative CHECK (final_amount >= 0)'
);
CALL add_check_if_missing(
  'orders',
  'ck_orders_final_le_total',
  'ALTER TABLE orders ADD CONSTRAINT ck_orders_final_le_total CHECK (final_amount <= total_amount)'
);
CALL add_check_if_missing(
  'payments',
  'ck_payments_amount_nonnegative',
  'ALTER TABLE payments ADD CONSTRAINT ck_payments_amount_nonnegative CHECK (amount >= 0)'
);
CALL add_check_if_missing(
  'vouchers',
  'ck_vouchers_discount_nonnegative',
  'ALTER TABLE vouchers ADD CONSTRAINT ck_vouchers_discount_nonnegative CHECK (discount_value >= 0)'
);
CALL add_check_if_missing(
  'vouchers',
  'ck_vouchers_min_order_nonnegative',
  'ALTER TABLE vouchers ADD CONSTRAINT ck_vouchers_min_order_nonnegative CHECK (min_order_amount >= 0)'
);
CALL add_check_if_missing(
  'vouchers',
  'ck_vouchers_max_discount_nonnegative',
  'ALTER TABLE vouchers ADD CONSTRAINT ck_vouchers_max_discount_nonnegative CHECK (max_discount IS NULL OR max_discount >= 0)'
);
CALL add_check_if_missing(
  'vouchers',
  'ck_vouchers_used_nonnegative',
  'ALTER TABLE vouchers ADD CONSTRAINT ck_vouchers_used_nonnegative CHECK (used_count >= 0)'
);

DROP PROCEDURE add_check_if_missing;

-- Buổi 6 - chống tạo POS sale lặp.
CREATE TABLE IF NOT EXISTS sale_requests (
  sale_request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NOT NULL,
  operation VARCHAR(30) NOT NULL,
  request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  order_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_sale_requests_actor_operation_key (actor_id, operation, request_key),
  KEY idx_sale_requests_order_id (order_id),

  CONSTRAINT fk_sale_requests_actor
    FOREIGN KEY (actor_id)
    REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_sale_requests_order
    FOREIGN KEY (order_id)
    REFERENCES orders(order_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;
