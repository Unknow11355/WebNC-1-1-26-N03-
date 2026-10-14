USE mini_supermarket;

-- CN10: Members and loyalty points.
-- Run after 17_buoi7_negative_constraints.sql.
-- Do not reset business data.

-- Existing invalid points must be fixed explicitly before constraints are added.
DROP PROCEDURE IF EXISTS validate_cn10_points;
DELIMITER //
CREATE PROCEDURE validate_cn10_points()
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE points IS NULL OR points < 0) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'users.points có NULL/âm; dừng migration để không che dữ liệu lỗi';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM loyalty_transactions
    WHERE points_change IS NULL OR points_change = 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'loyalty_transactions.points_change có NULL/0; dừng migration';
  END IF;
END//
DELIMITER ;
CALL validate_cn10_points();
DROP PROCEDURE validate_cn10_points;

ALTER TABLE users
  MODIFY points INT NOT NULL DEFAULT 0;

DROP PROCEDURE IF EXISTS add_cn10_check_if_missing;
DELIMITER //
CREATE PROCEDURE add_cn10_check_if_missing(
  IN p_table VARCHAR(64),
  IN p_name VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_name
  ) THEN
    SET @cn10_check_sql = p_sql;
    PREPARE cn10_check_stmt FROM @cn10_check_sql;
    EXECUTE cn10_check_stmt;
    DEALLOCATE PREPARE cn10_check_stmt;
  END IF;
END//
DELIMITER ;

CALL add_cn10_check_if_missing(
  'users',
  'ck_users_points_nonnegative',
  'ALTER TABLE users ADD CONSTRAINT ck_users_points_nonnegative CHECK (points >= 0)'
);
CALL add_cn10_check_if_missing(
  'loyalty_transactions',
  'ck_loyalty_points_change_nonzero',
  'ALTER TABLE loyalty_transactions ADD CONSTRAINT ck_loyalty_points_change_nonzero CHECK (points_change <> 0)'
);
DROP PROCEDURE add_cn10_check_if_missing;

DROP PROCEDURE IF EXISTS add_cn10_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_cn10_index_if_missing(
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
    SET @cn10_index_sql = p_sql;
    PREPARE cn10_index_stmt FROM @cn10_index_sql;
    EXECUTE cn10_index_stmt;
    DEALLOCATE PREPARE cn10_index_stmt;
  END IF;
END//
DELIMITER ;

CALL add_cn10_index_if_missing(
  'loyalty_transactions',
  'uq_loyalty_order_type',
  'ALTER TABLE loyalty_transactions ADD UNIQUE KEY uq_loyalty_order_type (order_id, type)'
);
CALL add_cn10_index_if_missing(
  'loyalty_transactions',
  'idx_loyalty_user_created',
  'ALTER TABLE loyalty_transactions ADD KEY idx_loyalty_user_created (user_id, created_at, loyalty_id)'
);
DROP PROCEDURE add_cn10_index_if_missing;

-- Every customer gets a stable membership code if it does not already have one.
-- The code is deterministic and based only on the immutable user_id.
UPDATE users u
JOIN roles r ON r.role_id = u.role_id
SET u.membership_code = CONCAT('MEM', LPAD(u.user_id, 8, '0'))
WHERE r.role_name = 'customer'
  AND (u.membership_code IS NULL OR TRIM(u.membership_code) = '');
