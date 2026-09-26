-- BUOI 4 - SEED TAI KHOAN DEMO CHO VINH
-- Chay sau 03_buoi4_auth_schema.sql.
-- Mat khau demo chi dung cho moi truong kiem thu.

USE mini_supermarket;

INSERT IGNORE INTO roles (role_name)
VALUES ('admin'), ('employee'), ('customer');

-- Tai khoan demo:
-- admin@mini.local / Admin@123
-- employee@mini.local / Employee@123
-- customer.a@mini.local / CustomerA@123
-- customer.b@mini.local / CustomerB@123

INSERT INTO users (
  full_name,
  email,
  phone,
  password_hash,
  address,
  role_id,
  status,
  employment_type
)
VALUES
(
  'Admin Buoi 4',
  'admin@mini.local',
  '0910000001',
  '$2b$12$XARubtwmE/x2uLvzuht18OlUtH0ctkXYLtgi1E1pyGB0jKCBjB9sq',
  'Ha Noi',
  (SELECT role_id FROM roles WHERE role_name = 'admin'),
  'active',
  'full_time'
),
(
  'Employee Buoi 4',
  'employee@mini.local',
  '0910000002',
  '$2b$12$NZNQC9rS3ZiBqK1F/NNo5u0XBBLLpkNxj/oQEuDCqJlfRyVPKy/9u',
  'Ha Noi',
  (SELECT role_id FROM roles WHERE role_name = 'employee'),
  'active',
  'full_time'
),
(
  'Customer A Buoi 4',
  'customer.a@mini.local',
  '0910000003',
  '$2b$12$ujH8.ip1uASbe4dCTAY0jeaMT8XegqPgoibvum0u4DHvcKYkYr.j2',
  'Ha Noi',
  (SELECT role_id FROM roles WHERE role_name = 'customer'),
  'active',
  'full_time'
),
(
  'Customer B Buoi 4',
  'customer.b@mini.local',
  '0910000004',
  '$2b$12$PQJ49bhRHQL68OSDtq08xOdMtPkyR3/W4qBA6A7YBui2xexQMnQoW',
  'Ha Noi',
  (SELECT role_id FROM roles WHERE role_name = 'customer'),
  'active',
  'full_time'
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  password_hash = VALUES(password_hash),
  role_id = VALUES(role_id),
  status = VALUES(status);
