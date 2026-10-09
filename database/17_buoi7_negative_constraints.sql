USE mini_supermarket;

-- Kiểm chứng trực tiếp DB từ chối dữ liệu vi phạm. Chạy trên DB TEST.
DROP TEMPORARY TABLE IF EXISTS buoi7_constraint_results;
CREATE TEMPORARY TABLE buoi7_constraint_results (
  test_name VARCHAR(80) NOT NULL,
  result VARCHAR(10) NOT NULL,
  detail VARCHAR(255) NOT NULL
);

DROP PROCEDURE IF EXISTS run_b7_negative_tests;
DELIMITER //
CREATE PROCEDURE run_b7_negative_tests()
BEGIN
  DECLARE v_product_id INT;
  DECLARE v_order_id INT;
  DECLARE v_inventory_id INT;
  DECLARE v_rejected BOOLEAN DEFAULT FALSE;

  SELECT product_id INTO v_product_id FROM products WHERE barcode='B7-REP-001' LIMIT 1;
  SELECT order_id INTO v_order_id FROM orders WHERE note='B7_FIXTURE_PAID_A' LIMIT 1;
  SELECT inventory_item_id INTO v_inventory_id FROM inventory_items WHERE barcode='B5-IMPORT-001' LIMIT 1;

  SET v_rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_rejected = TRUE;
    UPDATE products SET stock = -1 WHERE product_id = v_product_id;
  END;
  INSERT INTO buoi7_constraint_results VALUES (
    'products.stock < 0',
    IF(v_rejected, 'PASS', 'FAIL'),
    IF(v_rejected, 'DB đã từ chối phép gán stock âm', 'UPDATE stock âm không bị từ chối')
  );

  SET v_rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_rejected = TRUE;
    UPDATE inventory_items SET stock = -1 WHERE inventory_item_id = v_inventory_id;
  END;
  INSERT INTO buoi7_constraint_results VALUES (
    'inventory_items.stock < 0',
    IF(v_rejected, 'PASS', 'FAIL'),
    IF(v_rejected, 'DB đã từ chối tồn kho âm', 'UPDATE tồn kho âm không bị từ chối')
  );

  SET v_rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_rejected = TRUE;
    INSERT INTO order_items(order_id, product_id, quantity, price, subtotal)
    VALUES (v_order_id, v_product_id, 0, 30000, 0);
  END;
  INSERT INTO buoi7_constraint_results VALUES (
    'order_items.quantity <= 0',
    IF(v_rejected, 'PASS', 'FAIL'),
    IF(v_rejected, 'DB đã từ chối quantity không dương', 'INSERT quantity = 0 không bị từ chối')
  );

  SET v_rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_rejected = TRUE;
    UPDATE orders SET discount_amount = total_amount + 1 WHERE order_id = v_order_id;
  END;
  INSERT INTO buoi7_constraint_results VALUES (
    'orders.discount > total',
    IF(v_rejected, 'PASS', 'FAIL'),
    IF(v_rejected, 'DB đã từ chối discount lớn hơn total', 'UPDATE discount > total không bị từ chối')
  );

  SET v_rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_rejected = TRUE;
    INSERT INTO payments(order_id, method, amount, status) VALUES (v_order_id, 'cash', -1, 'paid');
  END;
  INSERT INTO buoi7_constraint_results VALUES (
    'payments.amount < 0',
    IF(v_rejected, 'PASS', 'FAIL'),
    IF(v_rejected, 'DB đã từ chối amount âm', 'INSERT amount âm không bị từ chối')
  );
END//
DELIMITER ;
CALL run_b7_negative_tests();
DROP PROCEDURE run_b7_negative_tests;

SELECT * FROM buoi7_constraint_results ORDER BY test_name;
