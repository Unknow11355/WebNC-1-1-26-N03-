USE mini_supermarket;

-- Fixture riêng cho Buổi 6. Không reset dữ liệu kinh doanh hiện có.
INSERT IGNORE INTO roles (role_name) VALUES ('customer'), ('employee'), ('admin');

SET @cat_test := (
  SELECT category_id
  FROM categories
  WHERE category_name = 'Buoi 6 Test'
  LIMIT 1
);

INSERT INTO categories(category_name)
SELECT 'Buoi 6 Test'
WHERE @cat_test IS NULL;

SET @cat_test := (
  SELECT category_id
  FROM categories
  WHERE category_name = 'Buoi 6 Test'
  LIMIT 1
);

-- Một tài khoản employee fixture lấy từ seed Buổi 5 nếu đã có.
-- Nếu DB chưa có, dùng tài khoản employee hiện tại của nhóm để đăng nhập online.

INSERT INTO products
(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES
('B6 POS Product 01', 'B6-POS-001', 'Fixture 50 request - stock 10', NULL, 10000, 'sp', 10, 2, @cat_test, 'active'),
('B6 POS Product 02', 'B6-POS-002', 'Fixture sản phẩm khả dụng', NULL, 15000, 'sp', 20, 2, @cat_test, 'active'),
('B6 POS Product 03', 'B6-POS-003', 'Fixture sản phẩm khả dụng', NULL, 20000, 'sp', 15, 2, @cat_test, 'active'),
('B6 POS Product 04', 'B6-POS-004', 'Fixture sản phẩm khả dụng', NULL, 25000, 'sp', 8, 2, @cat_test, 'active'),
('B6 POS Product 05', 'B6-POS-005', 'Fixture hết hàng', NULL, 30000, 'sp', 0, 1, @cat_test, 'active'),
('B6 POS Product 06', 'B6-POS-006', 'Fixture tồn thấp', NULL, 35000, 'sp', 5, 1, @cat_test, 'active'),
('B6 POS Product 07', 'B6-POS-007', 'Fixture sản phẩm khả dụng', NULL, 40000, 'sp', 12, 2, @cat_test, 'active'),
('B6 POS Product 08', 'B6-POS-008', 'Fixture đơn nhiều dòng', NULL, 45000, 'sp', 7, 2, @cat_test, 'active'),
('B6 POS Product 09', 'B6-POS-009', 'Fixture sản phẩm khả dụng', NULL, 50000, 'sp', 30, 2, @cat_test, 'active'),
('B6 POS Product 10', 'B6-POS-010', 'Fixture sản phẩm ngừng bán', NULL, 55000, 'sp', 25, 2, @cat_test, 'inactive')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  price = VALUES(price),
  unit = VALUES(unit),
  min_stock = VALUES(min_stock),
  category_id = VALUES(category_id);

-- Đặt lại đúng tồn của bộ fixture test trên DB test.
UPDATE products
SET stock = CASE barcode
  WHEN 'B6-POS-001' THEN 10
  WHEN 'B6-POS-002' THEN 20
  WHEN 'B6-POS-003' THEN 15
  WHEN 'B6-POS-004' THEN 8
  WHEN 'B6-POS-005' THEN 0
  WHEN 'B6-POS-006' THEN 5
  WHEN 'B6-POS-007' THEN 12
  WHEN 'B6-POS-008' THEN 7
  WHEN 'B6-POS-009' THEN 30
  WHEN 'B6-POS-010' THEN 25
END,
status = CASE barcode
  WHEN 'B6-POS-010' THEN 'inactive'
  ELSE 'active'
END
WHERE barcode IN (
  'B6-POS-001', 'B6-POS-002', 'B6-POS-003', 'B6-POS-004',
  'B6-POS-005', 'B6-POS-006', 'B6-POS-007', 'B6-POS-008',
  'B6-POS-009', 'B6-POS-010'
);

-- Gợi ý bài 50 request:
-- B6-POS-001 có stock = 10. Dùng 50 key khác nhau, mỗi request quantity = 1.
-- Kỳ vọng khi test đồng thời: tối đa 10 giao dịch thành công, các request còn lại phải báo INSUFFICIENT_STOCK.
-- Bài replay: dùng cùng actor + key + payload; chỉ một order được tạo.
-- Bài key reuse: giữ key nhưng đổi quantity/customer/note; phải trả KEY_REUSE_CONFLICT.
