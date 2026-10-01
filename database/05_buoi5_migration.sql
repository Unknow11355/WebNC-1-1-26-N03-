USE mini_supermarket;

-- 1) Chuẩn hóa mật khẩu: backend mới chỉ dùng password_hash.
UPDATE users
SET password_hash = password
WHERE password_hash IS NULL AND password LIKE '$2%';

DROP PROCEDURE IF EXISTS check_password_hashes;
DELIMITER //
CREATE PROCEDURE check_password_hashes()
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL OR password_hash = '') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Có user chưa có password_hash hợp lệ; dừng migration để tránh mất dữ liệu đăng nhập';
  END IF;
END//
DELIMITER ;
CALL check_password_hashes();
DROP PROCEDURE check_password_hashes;

ALTER TABLE users MODIFY password VARCHAR(255) NULL;
ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL;

-- 2) Session cho JWT jti.
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_sessions_user_expires (user_id, expires_at),
  KEY idx_user_sessions_expires_revoked (expires_at, revoked_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3) Chỉ mục bám truy vấn thực tế của V2/V3.
DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_index_if_missing(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_sql TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
  ) THEN
    SET @idx_sql = p_sql;
    PREPARE idx_stmt FROM @idx_sql;
    EXECUTE idx_stmt;
    DEALLOCATE PREPARE idx_stmt;
  END IF;
END//
DELIMITER ;

CALL add_index_if_missing(
  'products', 'idx_products_status_category_product',
  'ALTER TABLE products ADD INDEX idx_products_status_category_product (status, category_id, product_id)'
);
CALL add_index_if_missing(
  'inventory_logs', 'idx_inventory_logs_item_created_log',
  'ALTER TABLE inventory_logs ADD INDEX idx_inventory_logs_item_created_log (inventory_item_id, created_at, log_id)'
);
CALL add_index_if_missing(
  'orders', 'idx_orders_customer_created_order',
  'ALTER TABLE orders ADD INDEX idx_orders_customer_created_order (customer_id, created_at, order_id)'
);
CALL add_index_if_missing(
  'orders', 'idx_orders_status_created_order',
  'ALTER TABLE orders ADD INDEX idx_orders_status_created_order (status, created_at, order_id)'
);
DROP PROCEDURE add_index_if_missing;
