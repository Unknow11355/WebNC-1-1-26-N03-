export function createInventoryRepository(db) {
  if (!db) throw new TypeError('Inventory repository requires a database executor');
  return {
    async list({ limit, offset, status = null }, executor = db) {
      const where = status ? 'WHERE status = ?' : '';
      const params = status
        ? [status, String(limit), String(offset)]
        : [String(limit), String(offset)];
      const [rows] = await executor.execute(
        `SELECT inventory_item_id, barcode, item_name, category_id, image_url,
                price, import_price, unit, stock, status, created_at
         FROM inventory_items ${where} ORDER BY inventory_item_id ASC LIMIT ? OFFSET ?`,
        params,
      );
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM inventory_items ${where}`,
        status ? [status] : [],
      );
      return { rows, total: Number(counts[0].total) };
    },
    async findById(id, executor = db) {
      const [rows] = await executor.execute(
        `SELECT inventory_item_id, barcode, item_name, category_id, image_url,
                price, import_price, unit, stock, status, created_at
         FROM inventory_items WHERE inventory_item_id = ? LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },
    async findByIdForUpdate(id, executor = db) {
      const [rows] = await executor.execute(
        `SELECT inventory_item_id, barcode, item_name, category_id, image_url,
                price, import_price, unit, stock, status, created_at
         FROM inventory_items WHERE inventory_item_id = ? LIMIT 1 FOR UPDATE`,
        [id],
      );
      return rows[0] ?? null;
    },
    async create(data, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO inventory_items
          (barcode, item_name, category_id, image_url, price, import_price, unit, stock, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          data.barcode,
          data.itemName,
          data.categoryId,
          data.imageUrl,
          data.price,
          data.importPrice,
          data.unit,
          data.status,
        ],
      );
      return this.findById(result.insertId, executor);
    },
    async softDelete(id, executor = db) {
      const [result] = await executor.execute(
        `UPDATE inventory_items SET status = 'inactive' WHERE inventory_item_id = ?`,
        [id],
      );
      return result.affectedRows;
    },
    async update(id, data, executor = db) {
      await executor.execute(
        `UPDATE inventory_items SET barcode = ?, item_name = ?, category_id = ?,
           image_url = ?, price = ?, import_price = ?, unit = ?, status = ?
         WHERE inventory_item_id = ?`,
        [
          data.barcode,
          data.itemName,
          data.categoryId,
          data.imageUrl,
          data.price,
          data.importPrice,
          data.unit,
          data.status,
          id,
        ],
      );
      return this.findById(id, executor);
    },
    async increaseStock(id, quantity, executor = db) {
      await executor.execute(
        `UPDATE inventory_items SET stock = stock + ? WHERE inventory_item_id = ?`,
        [quantity, id],
      );
    },
    async decreaseStock(id, quantity, executor = db) {
      const [result] = await executor.execute(
        `UPDATE inventory_items SET stock = stock - ?
         WHERE inventory_item_id = ? AND stock >= ?`,
        [quantity, id, quantity],
      );
      if (result.affectedRows !== 1) throw new Error('INVENTORY_STOCK_UPDATE_FAILED');
    },
    async setStock(id, stock, executor = db) {
      await executor.execute(`UPDATE inventory_items SET stock = ? WHERE inventory_item_id = ?`, [
        stock,
        id,
      ]);
    },
    async addLog(data, executor = db) {
      await executor.execute(
        `INSERT INTO inventory_logs
          (inventory_item_id, product_id, employee_id, action, quantity, import_price, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.inventoryItemId,
          data.productId,
          data.employeeId,
          data.action,
          data.quantity,
          data.importPrice,
          data.note,
        ],
      );
    },
    async listLogs({ limit, offset, inventoryItemId = null }, executor = db) {
      const where = inventoryItemId ? 'WHERE inventory_item_id = ?' : '';
      const listParams = inventoryItemId
        ? [inventoryItemId, String(limit), String(offset)]
        : [String(limit), String(offset)];
      const [rows] = await executor.execute(
        `SELECT log_id, inventory_item_id, product_id, employee_id,
                action, quantity, import_price, note, created_at
         FROM inventory_logs ${where} ORDER BY created_at DESC, log_id DESC LIMIT ? OFFSET ?`,
        listParams,
      );
      const countParams = inventoryItemId ? [inventoryItemId] : [];
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM inventory_logs ${where}`,
        countParams,
      );
      return { rows, total: Number(counts[0].total) };
    },
  };
}
