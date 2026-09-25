// Tầng truy cập dữ liệu: chỉ SQL, không req/res hoặc quyết định HTTP.
export function createProductRepository(db) {
  return {
    async list({ limit, offset }) {
      const [rows] = await db.execute(
        `SELECT product_id, product_name, barcode, price, unit, stock,
                category_id, image_url
         FROM products WHERE status = ?
         ORDER BY product_id ASC LIMIT ? OFFSET ?`,
        ['active', String(limit), String(offset)],
      );
      const [counts] = await db.execute(
        'SELECT COUNT(*) AS total FROM products WHERE status = ?', ['active'],
      );
      return { rows, total: Number(counts[0].total) };
    },
  };
}
