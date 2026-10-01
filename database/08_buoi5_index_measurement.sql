USE mini_supermarket;

-- Dùng cùng các điều kiện với truy vấn backend. Chạy EXPLAIN trước khi/ sau khi tạo index.
EXPLAIN SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit, p.stock, p.category_id
FROM products p
WHERE p.status = 'active' AND p.category_id = (SELECT MIN(category_id) FROM categories)
ORDER BY p.product_id ASC
LIMIT 20 OFFSET 0;

EXPLAIN SELECT log_id, inventory_item_id, product_id, employee_id, action, quantity, created_at
FROM inventory_logs
WHERE inventory_item_id = (SELECT MIN(inventory_item_id) FROM inventory_items)
ORDER BY created_at DESC, log_id DESC
LIMIT 20 OFFSET 0;

EXPLAIN SELECT order_id, customer_id, delivery_method, final_amount, status, payment_status, created_at
FROM orders
WHERE customer_id = (SELECT MIN(user_id) FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name='customer'))
ORDER BY created_at DESC, order_id DESC
LIMIT 20 OFFSET 0;

EXPLAIN SELECT order_id, customer_id, delivery_method, final_amount, status, payment_status, created_at
FROM orders
WHERE status = 'pending'
ORDER BY created_at DESC, order_id DESC
LIMIT 20 OFFSET 0;
