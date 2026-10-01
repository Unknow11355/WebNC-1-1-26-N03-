USE mini_supermarket;

INSERT IGNORE INTO roles (role_name) VALUES ('customer'), ('employee'), ('admin');

-- Tài khoản fixture Buổi 5. Hash được giữ từ seed Buổi 4/5 của nhóm; không dùng mật khẩu plaintext trong SQL.
INSERT INTO users
(full_name, email, phone, password, password_hash, address, role_id, status, employment_type)
VALUES
('Admin Buoi 5', 'admin.b5@mini.local', '0910000101', '$2b$12$XARubtwmE/x2uLvzuht18OlUtH0ctkXYLtgi1E1pyGB0jKCBjB9sq', '$2b$12$XARubtwmE/x2uLvzuht18OlUtH0ctkXYLtgi1E1pyGB0jKCBjB9sq', 'Ha Noi', (SELECT role_id FROM roles WHERE role_name='admin'), 'active', 'full_time'),
('Employee Buoi 5', 'employee.b5@mini.local', '0910000102', '$2b$12$NZNQC9rS3ZiBqK1F/NNo5u0XBBLLpkNxj/oQEuDCqJlfRyVPKy/9u', '$2b$12$NZNQC9rS3ZiBqK1F/NNo5u0XBBLLpkNxj/oQEuDCqJlfRyVPKy/9u', 'Ha Noi', (SELECT role_id FROM roles WHERE role_name='employee'), 'active', 'full_time'),
('Customer A Buoi 5', 'customer.a.b5@mini.local', '0910000103', '$2b$12$ujH8.ip1uASbe4dCTAY0jeaMT8XegqPgoibvum0u4DHvcKYkYr.j2', '$2b$12$ujH8.ip1uASbe4dCTAY0jeaMT8XegqPgoibvum0u4DHvcKYkYr.j2', 'Ha Noi', (SELECT role_id FROM roles WHERE role_name='customer'), 'active', 'full_time'),
('Customer B Buoi 5', 'customer.b.b5@mini.local', '0910000104', '$2b$12$PQJ49bhRHQL68OSDtq08xOdMtPkyR3/W4qBA6A7YBui2xexQMnQoW', '$2b$12$PQJ49bhRHQL68OSDtq08xOdMtPkyR3/W4qBA6A7YBui2xexQMnQoW', 'Ha Noi', (SELECT role_id FROM roles WHERE role_name='customer'), 'active', 'full_time')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status='active';

INSERT IGNORE INTO categories(category_name) VALUES ('Đồ uống'), ('Buoi 5 Test');
SET @cat_drink := (SELECT category_id FROM categories WHERE category_name='Đồ uống' LIMIT 1);
SET @cat_test := (SELECT category_id FROM categories WHERE category_name='Buoi 5 Test' LIMIT 1);

-- Tồn kệ low-stock để test chặn checkout không đủ hàng.
INSERT INTO products(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES ('B5 Low Stock', 'B5-LOW-001', 'Fixture test thiếu tồn', NULL, 50000, 'sp', 2, 2, @cat_test, 'active')
ON DUPLICATE KEY UPDATE stock=2, status='active', price=50000, category_id=@cat_test;

-- Sản phẩm có tồn kệ và dùng riêng cho fixture trạng thái đơn.
INSERT INTO products(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES ('B5 Order State Product', 'B5-STATE-001', 'Fixture các trạng thái đơn', NULL, 30000, 'sp', 97, 5, @cat_drink, 'active')
ON DUPLICATE KEY UPDATE stock=97, status='active', price=30000, category_id=@cat_drink;

-- Sản phẩm hết hàng để test checkout bị chặn theo tồn kệ.
INSERT INTO products(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES ('B5 Out Of Stock', 'B5-OOS-001', 'Fixture test hết hàng', NULL, 45000, 'sp', 0, 1, @cat_test, 'active')
ON DUPLICATE KEY UPDATE stock=0, status='active', price=45000, category_id=@cat_test;

-- Kho riêng cho test import/export hiện có và export tạo mới sản phẩm.
INSERT INTO inventory_items(barcode, item_name, category_id, image_url, price, import_price, unit, stock, status)
VALUES
('B5-IMPORT-001', 'B5 Import Existing Shelf', @cat_test, NULL, 30000, 20000, 'sp', 10, 'available'),
('B5-NEW-SHELF-001', 'B5 New Shelf Product', @cat_drink, NULL, 15000, 10000, 'sp', 10, 'available')
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name), category_id=VALUES(category_id), price=VALUES(price), import_price=VALUES(import_price), unit=VALUES(unit), status='available';

INSERT INTO products(product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
VALUES ('B5 Existing Shelf Product', 'B5-IMPORT-001', 'Fixture export vào sản phẩm đã có', NULL, 30000, 'sp', 5, 2, @cat_test, 'active')
ON DUPLICATE KEY UPDATE stock=5, status='active', category_id=@cat_test;

-- Voucher: hợp lệ / hết hạn / hết lượt.
INSERT INTO vouchers(code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, expiry_date, status)
VALUES
('B5VALID', 'Voucher hợp lệ Buoi 5', 'percent', 10, 100000, 30000, 10, 0, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'active'),
('B5EXPIRED', 'Voucher hết hạn Buoi 5', 'fixed', 20000, 0, NULL, 10, 0, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 'active'),
('B5EXHAUSTED', 'Voucher hết lượt Buoi 5', 'fixed', 10000, 0, NULL, 1, 1, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'active'),
('B5FIXED', 'Voucher fixed Buoi 5', 'fixed', 20000, 50000, NULL, 20, 0, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'active')
ON DUPLICATE KEY UPDATE status='active';

-- Giỏ hàng fixture của Customer A.
SET @customer_a := (SELECT user_id FROM users WHERE email='customer.a.b5@mini.local' LIMIT 1);
SET @low_product := (SELECT product_id FROM products WHERE barcode='B5-LOW-001' LIMIT 1);
SET @customer_b := (SELECT user_id FROM users WHERE email='customer.b.b5@mini.local' LIMIT 1);
SET @oos_product := (SELECT product_id FROM products WHERE barcode='B5-OOS-001' LIMIT 1);
INSERT INTO carts(user_id) VALUES (@customer_a)
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);
SET @cart_a := (SELECT cart_id FROM carts WHERE user_id=@customer_a LIMIT 1);
INSERT INTO cart_items(cart_id, product_id, quantity) VALUES (@cart_a, @low_product, 1)
ON DUPLICATE KEY UPDATE quantity=1;

-- Cart Customer B dùng riêng để test checkout với sản phẩm hết hàng.
INSERT INTO carts(user_id) VALUES (@customer_b)
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);
SET @cart_b := (SELECT cart_id FROM carts WHERE user_id=@customer_b LIMIT 1);
INSERT INTO cart_items(cart_id, product_id, quantity) VALUES (@cart_b, @oos_product, 1)
ON DUPLICATE KEY UPDATE quantity=1;

-- Xoá và dựng lại các order fixture có nhãn cố định để seed chạy lại được.
DELETE FROM orders WHERE note LIKE 'B5_FIXTURE_%';
SET @state_product := (SELECT product_id FROM products WHERE barcode='B5-STATE-001' LIMIT 1);

INSERT INTO orders(customer_id, order_type, delivery_method, total_amount, discount_amount, final_amount, payment_method,
                   status, payment_status, order_status, shipping_address, note)
VALUES
(@customer_b, 'online', 'delivery', 30000, 0, 30000, 'cash', 'pending', 'pending', 'pending', 'Ha Noi', 'B5_FIXTURE_PENDING'),
(@customer_b, 'online', 'delivery', 30000, 0, 30000, 'cash', 'shipping', 'pending', 'shipping', 'Ha Noi', 'B5_FIXTURE_SHIPPING'),
(@customer_b, 'online', 'pickup', 30000, 0, 30000, 'cash', 'completed', 'paid', 'completed', NULL, 'B5_FIXTURE_COMPLETED'),
(@customer_b, 'online', 'delivery', 30000, 0, 30000, 'cash', 'rejected', 'pending', 'rejected', 'Ha Noi', 'B5_FIXTURE_REJECTED');

SET @o_pending := (SELECT order_id FROM orders WHERE note='B5_FIXTURE_PENDING' LIMIT 1);
SET @o_shipping := (SELECT order_id FROM orders WHERE note='B5_FIXTURE_SHIPPING' LIMIT 1);
SET @o_completed := (SELECT order_id FROM orders WHERE note='B5_FIXTURE_COMPLETED' LIMIT 1);
SET @o_rejected := (SELECT order_id FROM orders WHERE note='B5_FIXTURE_REJECTED' LIMIT 1);

INSERT INTO order_items(order_id, product_id, quantity, price, subtotal)
VALUES
(@o_pending, @state_product, 1, 30000, 30000),
(@o_shipping, @state_product, 1, 30000, 30000),
(@o_completed, @state_product, 1, 30000, 30000),
(@o_rejected, @state_product, 1, 30000, 30000);

INSERT INTO payments(order_id, method, amount, status, transaction_id, paid_at)
VALUES
(@o_pending, 'cash', 30000, 'pending', NULL, NULL),
(@o_shipping, 'cash', 30000, 'pending', NULL, NULL),
(@o_completed, 'cash', 30000, 'paid', NULL, CURRENT_TIMESTAMP),
(@o_rejected, 'cash', 30000, 'pending', NULL, NULL);

-- Đồng bộ category cho item kho có barcode trùng sản phẩm.
UPDATE inventory_items ii
JOIN products p ON p.barcode = ii.barcode
SET ii.category_id = p.category_id
WHERE ii.category_id IS NULL;
