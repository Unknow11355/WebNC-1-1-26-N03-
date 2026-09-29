-- BUOI 4 - AUTH SCHEMA PATCH
-- Database goc cua nhom: mini_supermarket
-- Schema Buoi 3 dang co ca users.password va users.password_hash.
-- Tu Buoi 4: backend moi su dung users.password_hash lam nguon hash chinh.
--
-- Thu tu chay: 00_reset.sql -> 01_schema.sql -> 02_seed.sql -> 03_buoi4_auth_schema.sql -> 04_buoi4_seed.sql

USE mini_supermarket;

-- 1) Dong bo cac ban ghi cu neu password_hash dang rong nhung password la bcrypt hash.
UPDATE users
SET password_hash = password
WHERE password_hash IS NULL
  AND password LIKE '$2%';

-- 2) Khong xoa cot password ngay de tranh pha code cu cua nhom.
-- Backend Buoi 4 khong doc/ghi cot password nua.
ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NULL;

-- 3) Kiem tra con tai khoan nao thieu hash hay khong.
SELECT COUNT(*) AS users_missing_password_hash
FROM users
WHERE password_hash IS NULL;

-- Khi ket qua = 0, nhom co the chot rang password_hash NOT NULL va xoa password legacy
-- sau khi da xac nhan tat ca code cu khong con su dung no:
-- ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;
-- ALTER TABLE users DROP COLUMN password;
