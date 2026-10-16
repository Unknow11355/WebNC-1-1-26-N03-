export function createReviewRepository(pool) {
  return {
    async create(data) {
      const [result] = await pool.query(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [data.product_id, data.user_id, data.rating, data.comment]
      );
      return { review_id: result.insertId };
    },
    async checkDuplicate(productId, userId) {
      const [rows] = await pool.query(
        'SELECT review_id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      );
      return rows.length > 0;
    },
    async getByProduct(productId) {
      const [rows] = await pool.query(`
        SELECT r.*, u.full_name as customer_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
      `, [productId]);
      return rows;
    },
    async findById(reviewId) {
      const [rows] = await pool.query('SELECT * FROM reviews WHERE review_id = ?', [reviewId]);
      return rows[0] || null;
    },
    async delete(reviewId) {
      await pool.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
    }
  };
}