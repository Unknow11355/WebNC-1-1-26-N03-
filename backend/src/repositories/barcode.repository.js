export function createBarcodeRepository(db) {
  return {
    async product(code, activeOnly = true) {
      const [rows] = await db.execute(
        `SELECT product_id, product_name, barcode, price, stock, unit, image_url, status FROM products WHERE barcode = ? ${activeOnly ? "AND status = 'active'" : ''} LIMIT 1`,
        [code],
      );
      return rows[0] ?? null;
    },
    async inventory(code, activeOnly = true) {
      const [rows] = await db.execute(
        `SELECT inventory_item_id, item_name, barcode, price, import_price, stock, unit, image_url, status FROM inventory_items WHERE barcode = ? ${activeOnly ? "AND status IN ('active','available')" : ''} LIMIT 1`,
        [code],
      );
      return rows[0] ?? null;
    },
  };
}
