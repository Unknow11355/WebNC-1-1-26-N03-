export function createProductRepository(db) {
  if (!db) throw new TypeError('Product repository requires a database executor');

  async function findById(productId, executor = db) {
    const [rows] = await executor.execute(
      `SELECT product_id, product_name, barcode, description, image_url, price, unit,
              stock, min_stock, category_id, status
       FROM products WHERE product_id = ? LIMIT 1`,
      [productId],
    );
    return rows[0] ?? null;
  }

  return {
    async list({ limit, offset, q = null, categoryId = null }, executor = db) {
      const conditions = ['p.status = ?'];
      const params = ['active'];
      if (q) {
        conditions.push('(p.product_name LIKE ? OR p.barcode LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
      if (categoryId !== null) {
        conditions.push('p.category_id = ?');
        params.push(categoryId);
      }
      const where = conditions.join(' AND ');
      const [rows] = await executor.execute(
        `SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit,
                p.stock, p.category_id, p.image_url
         FROM products p WHERE ${where}
         ORDER BY p.product_id ASC LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)],
      );
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM products p WHERE ${where}`,
        params,
      );
      return { rows, total: Number(counts[0].total) };
    },
    findById,
    async findByBarcodeForUpdate(barcode, executor = db) {
      const [rows] = await executor.execute(
        `SELECT product_id, product_name, barcode, description, image_url, price, unit,
                stock, min_stock, category_id, status
         FROM products WHERE barcode = ? LIMIT 1 FOR UPDATE`,
        [barcode],
      );
      return rows[0] ?? null;
    },
    async create(data, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO products
          (product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          data.productName,
          data.barcode,
          data.description,
          data.imageUrl,
          data.price,
          data.unit,
          data.stock,
          data.minStock,
          data.categoryId,
        ],
      );
      return findById(result.insertId, executor);
    },
    async update(productId, data, executor = db) {
      await executor.execute(
        `UPDATE products
         SET product_name = ?, barcode = ?, description = ?, image_url = ?,
             price = ?, unit = ?, min_stock = ?, category_id = ?
         WHERE product_id = ?`,
        [
          data.productName,
          data.barcode,
          data.description,
          data.imageUrl,
          data.price,
          data.unit,
          data.minStock,
          data.categoryId,
          productId,
        ],
      );
      return findById(productId, executor);
    },
    async softDelete(productId, executor = db) {
      const [result] = await executor.execute(
        `UPDATE products SET status = 'inactive' WHERE product_id = ?`,
        [productId],
      );
      return result.affectedRows;
    },
    async increaseStock(productId, quantity, executor = db) {
      await executor.execute(`UPDATE products SET stock = stock + ? WHERE product_id = ?`, [
        quantity,
        productId,
      ]);
    },
    async decreaseStock(productId, quantity, executor = db) {
      const [result] = await executor.execute(
        `UPDATE products SET stock = stock - ?
         WHERE product_id = ? AND stock >= ? AND status = 'active'`,
        [quantity, productId, quantity],
      );
      if (result.affectedRows !== 1) throw new Error('PRODUCT_STOCK_UPDATE_FAILED');
    },
  };
}
