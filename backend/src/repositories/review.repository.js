export function createReviewRepository(db) {
  if (!db) throw new TypeError('Review repository requires a database executor');

  return {
    async findByProductId(productId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT
           r.review_id, r.user_id, r.product_id, r.order_id, r.order_item_id,
           r.rating, r.comment, r.created_at,
           u.full_name AS customer_name
         FROM reviews r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.product_id = ?
         ORDER BY r.created_at DESC`,
        [productId]
      );
      return rows;
    },

    async findById(reviewId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT * FROM reviews WHERE review_id = ? LIMIT 1`,
        [reviewId]
      );
      return rows[0] ?? null;
    },

    async checkCompletedOrderItem(userId, productId, executor = db) {
      // Tìm 1 sản phẩm trong đơn hàng đã hoàn thành (completed) của user này
      const [rows] = await executor.execute(
        `SELECT oi.order_item_id, o.order_id
         FROM order_items oi
         JOIN orders o ON o.order_id = oi.order_id
         WHERE o.customer_id = ?
           AND oi.product_id = ?
           AND o.status = 'completed'
         LIMIT 1`,
        [userId, productId]
      );
      return rows[0] ?? null;
    },

    async checkDuplicateReview(userId, productId, executor = db) {
      // Mỗi khách hàng chỉ được đánh giá 1 sản phẩm 1 lần
      const [rows] = await executor.execute(
        `SELECT review_id FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1`,
        [userId, productId]
      );
      return rows.length > 0;
    },

    async createReview({ userId, productId, orderId, orderItemId, rating, comment }, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO reviews (user_id, product_id, order_id, order_item_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, productId, orderId, orderItemId, rating, comment]
      );
      return result.insertId;
    },

    async deleteReview(reviewId, executor = db) {
      await executor.execute(`DELETE FROM reviews WHERE review_id = ?`, [reviewId]);
    }
  };
}