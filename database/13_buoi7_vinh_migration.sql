USE mini_supermarket;

-- Buổi 7 - Vinh V2/V3. Migration phải chạy độc lập sau schema Buổi 6.
-- Không reset dữ liệu kinh doanh chung.

-- K8: audit_logs là bảng nhật ký hệ thống riêng, không dùng inventory_logs thay thế.
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id BIGINT NULL,
  outcome VARCHAR(20) NOT NULL,
  request_id VARCHAR(100) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_audit_created_id (created_at, audit_log_id),
  KEY idx_audit_actor_created (actor_id, created_at, audit_log_id),

  CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_id)
    REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT ck_audit_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE'))
) ENGINE=InnoDB;


DROP PROCEDURE IF EXISTS add_b7_column_if_missing;
DELIMITER //
CREATE PROCEDURE add_b7_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_column
  ) THEN
    SET @b7_sql = p_sql;
    PREPARE b7_stmt FROM @b7_sql;
    EXECUTE b7_stmt;
    DEALLOCATE PREPARE b7_stmt;
  END IF;
END//
DELIMITER ;

-- Reset token: otp_code cũ có thể NULL; token_hash là SHA-256 của token thô.
ALTER TABLE password_reset_tokens MODIFY otp_code VARCHAR(255) NULL;
CALL add_b7_column_if_missing(
  'password_reset_tokens', 'token_hash',
  'ALTER TABLE password_reset_tokens ADD COLUMN token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER otp_code'
);

-- Notifications: không tự gán chủ sở hữu cho dữ liệu cũ; chỉ bản ghi mới có recipient/event_key.
CALL add_b7_column_if_missing(
  'notifications', 'recipient_user_id',
  'ALTER TABLE notifications ADD COLUMN recipient_user_id INT NULL AFTER notification_id'
);
CALL add_b7_column_if_missing(
  'notifications', 'order_id',
  'ALTER TABLE notifications ADD COLUMN order_id INT NULL AFTER recipient_user_id'
);
CALL add_b7_column_if_missing(
  'notifications', 'event_key',
  'ALTER TABLE notifications ADD COLUMN event_key VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER order_id'
);
DROP PROCEDURE add_b7_column_if_missing;

DROP PROCEDURE IF EXISTS add_b7_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_b7_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
  ) THEN
    SET @b7_idx_sql = p_sql;
    PREPARE b7_idx_stmt FROM @b7_idx_sql;
    EXECUTE b7_idx_stmt;
    DEALLOCATE PREPARE b7_idx_stmt;
  END IF;
END//
DELIMITER ;

CALL add_b7_index_if_missing(
  'password_reset_tokens', 'idx_password_reset_token_hash',
  'ALTER TABLE password_reset_tokens ADD INDEX idx_password_reset_token_hash (token_hash, used, expired_at)'
);
CALL add_b7_index_if_missing(
  'notifications', 'uq_notifications_recipient_event',
  'ALTER TABLE notifications ADD UNIQUE KEY uq_notifications_recipient_event (recipient_user_id, event_key)'
);
CALL add_b7_index_if_missing(
  'notifications', 'idx_notifications_recipient_created',
  'ALTER TABLE notifications ADD KEY idx_notifications_recipient_created (recipient_user_id, created_at, notification_id)'
);
CALL add_b7_index_if_missing(
  'notifications', 'idx_notifications_order_id',
  'ALTER TABLE notifications ADD KEY idx_notifications_order_id (order_id)'
);
CALL add_b7_index_if_missing(
  'products', 'idx_products_status_category_price_id',
  'ALTER TABLE products ADD INDEX idx_products_status_category_price_id (status, category_id, price, product_id)'
);
CALL add_b7_index_if_missing(
  'products', 'idx_products_status_stock_id',
  'ALTER TABLE products ADD INDEX idx_products_status_stock_id (status, stock, product_id)'
);
CALL add_b7_index_if_missing(
  'products', 'idx_products_status_name_id',
  'ALTER TABLE products ADD INDEX idx_products_status_name_id (status, product_name, product_id)'
);
CALL add_b7_index_if_missing(
  'orders', 'idx_orders_payment_paid_order_employee',
  'ALTER TABLE orders ADD INDEX idx_orders_payment_paid_order_employee (payment_status, paid_at, order_id, employee_id)'
);
CALL add_b7_index_if_missing(
  'order_items', 'idx_order_items_product_order',
  'ALTER TABLE order_items ADD INDEX idx_order_items_product_order (product_id, order_id)'
);
CALL add_b7_index_if_missing(
  'payments', 'idx_payments_order_status',
  'ALTER TABLE payments ADD INDEX idx_payments_order_status (order_id, status)'
);
DROP PROCEDURE add_b7_index_if_missing;

DROP PROCEDURE IF EXISTS add_b7_fk_if_missing;
DELIMITER //
CREATE PROCEDURE add_b7_fk_if_missing(
  IN p_table VARCHAR(64),
  IN p_constraint VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_constraint
  ) THEN
    SET @b7_fk_sql = p_sql;
    PREPARE b7_fk_stmt FROM @b7_fk_sql;
    EXECUTE b7_fk_stmt;
    DEALLOCATE PREPARE b7_fk_stmt;
  END IF;
END//
DELIMITER ;

CALL add_b7_fk_if_missing(
  'notifications', 'fk_notifications_recipient',
  'ALTER TABLE notifications ADD CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE'
);
CALL add_b7_fk_if_missing(
  'notifications', 'fk_notifications_order',
  'ALTER TABLE notifications ADD CONSTRAINT fk_notifications_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON UPDATE CASCADE ON DELETE SET NULL'
);
DROP PROCEDURE add_b7_fk_if_missing;
