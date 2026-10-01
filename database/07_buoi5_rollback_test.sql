USE mini_supermarket;

-- TEST-ONLY: chu dong gay loi FK trong transaction nhap kho de quan sat rollback.
-- Chi chay tren CSDL test. Khong chay tren moi truong production.
DROP PROCEDURE IF EXISTS buoi5_test_inventory_rollback;

DELIMITER //
CREATE PROCEDURE buoi5_test_inventory_rollback()
BEGIN
  DECLARE item_id INT;
  DECLARE employee_id_bad INT DEFAULT 2147483647;
  DECLARE before_stock INT;

  SELECT MIN(inventory_item_id) INTO item_id FROM inventory_items;
  IF item_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong co inventory_items de test';
  END IF;

  SELECT stock INTO before_stock
  FROM inventory_items
  WHERE inventory_item_id = item_id;

  START TRANSACTION;

  UPDATE inventory_items
  SET stock = stock + 1
  WHERE inventory_item_id = item_id;

  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
      ROLLBACK;
    END;

    INSERT INTO inventory_logs
      (inventory_item_id, product_id, employee_id, action, quantity, import_price, note)
    VALUES
      (item_id, NULL, employee_id_bad, 'import', 1, NULL, 'TEST_FORCE_FK_ERROR');
  END;

  SELECT
    before_stock AS stock_before,
    (SELECT stock FROM inventory_items WHERE inventory_item_id = item_id) AS stock_after,
    CASE
      WHEN before_stock = (SELECT stock FROM inventory_items WHERE inventory_item_id = item_id)
        THEN 'ROLLBACK_OK'
      ELSE 'ROLLBACK_FAILED'
    END AS result;
END//
DELIMITER ;

CALL buoi5_test_inventory_rollback();
DROP PROCEDURE IF EXISTS buoi5_test_inventory_rollback;
