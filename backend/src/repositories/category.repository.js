export function createCategoryRepository(db) {
  if (!db) throw new TypeError('Category repository requires a database executor');

  return {
    async list(executor = db) {
      const [rows] = await executor.execute(
        `SELECT category_id, category_name FROM categories ORDER BY category_id ASC`,
      );
      return rows;
    },
    async findById(categoryId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT category_id, category_name FROM categories WHERE category_id = ? LIMIT 1`,
        [categoryId],
      );
      return rows[0] ?? null;
    },
    async create({ categoryName }, executor = db) {
      const [result] = await executor.execute(`INSERT INTO categories (category_name) VALUES (?)`, [
        categoryName,
      ]);
      return this.findById(result.insertId, executor);
    },
    async update(categoryId, { categoryName }, executor = db) {
      await executor.execute(`UPDATE categories SET category_name = ? WHERE category_id = ?`, [
        categoryName,
        categoryId,
      ]);
      return this.findById(categoryId, executor);
    },
    async remove(categoryId, executor = db) {
      const [result] = await executor.execute(`DELETE FROM categories WHERE category_id = ?`, [
        categoryId,
      ]);
      return result.affectedRows;
    },
  };
}
