USE mini_supermarket;

-- CN10 read-only verification. Run on the TEST database after migration 18.

SELECT
  COUNT(*) AS invalid_negative_users
FROM users
WHERE points IS NULL OR points < 0;

SELECT
  COUNT(*) AS customers_without_membership_code
FROM users u
JOIN roles r ON r.role_id = u.role_id
WHERE r.role_name = 'customer'
  AND (u.membership_code IS NULL OR TRIM(u.membership_code) = '');

SELECT
  COUNT(*) AS invalid_loyalty_rows
FROM loyalty_transactions
WHERE points_change IS NULL OR points_change = 0;

SELECT
  COUNT(*) AS duplicate_order_type
FROM (
  SELECT order_id, type, COUNT(*) AS cnt
  FROM loyalty_transactions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, type
  HAVING COUNT(*) > 1
) d;

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = DATABASE()
  AND (
    (tc.table_name = 'users' AND tc.constraint_name = 'ck_users_points_nonnegative')
    OR (tc.table_name = 'loyalty_transactions' AND tc.constraint_name = 'ck_loyalty_points_change_nonzero')
    OR (tc.table_name = 'loyalty_transactions' AND tc.constraint_name = 'uq_loyalty_order_type')
  )
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  u.user_id,
  u.full_name,
  u.membership_code,
  u.points
FROM users u
JOIN roles r ON r.role_id = u.role_id
WHERE r.role_name = 'customer'
ORDER BY u.user_id ASC
LIMIT 20;
