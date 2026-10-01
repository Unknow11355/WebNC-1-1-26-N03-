USE mini_supermarket;

-- 1. Phân biệt tồn kho và tồn kệ
SELECT ii.barcode, ii.stock AS warehouse_stock, p.stock AS shelf_stock
FROM inventory_items ii
LEFT JOIN products p ON p.barcode = ii.barcode
WHERE ii.barcode IN ('B5-IMPORT-001', 'B5-NEW-SHELF-001');

-- 2. Voucher test fixture
SELECT code, discount_type, discount_value, usage_limit, used_count, expiry_date, status
FROM vouchers
WHERE code IN ('B5VALID', 'B5EXPIRED', 'B5EXHAUSTED', 'B5FIXED')
ORDER BY code;

-- 3. Đơn theo trạng thái
SELECT note, status, order_status, payment_status, delivery_method
FROM orders
WHERE note LIKE 'B5_FIXTURE_%'
ORDER BY order_id;

-- 4. Cart fixture của Customer A
SELECT c.cart_id, c.user_id, ci.product_id, ci.quantity
FROM carts c
JOIN cart_items ci ON ci.cart_id=c.cart_id
JOIN users u ON u.user_id=c.user_id
WHERE u.email='customer.a.b5@mini.local';


-- 5. Fixture checkout hết hàng của Customer B
SELECT u.email, p.barcode, p.stock, ci.quantity
FROM carts c
JOIN cart_items ci ON ci.cart_id = c.cart_id
JOIN products p ON p.product_id = ci.product_id
JOIN users u ON u.user_id = c.user_id
WHERE u.email='customer.b.b5@mini.local' AND p.barcode='B5-OOS-001';
