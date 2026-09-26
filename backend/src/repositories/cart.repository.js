// Tầng truy cập dữ liệu: chỉ SQL tham số hóa, không nhận req/res.
export function createCartRepository(db) {
  if (!db) throw new TypeError('Cart repository requires a database executor');

  async function findById(cartId, executor = db) {
    const [cartRows] = await executor.execute(
      `SELECT cart_id, user_id, created_at
       FROM carts
       WHERE cart_id = ?
       LIMIT 1`,
      [cartId],
    );

    const cart = cartRows[0] ?? null;
    if (!cart) return null;

    const [items] = await executor.execute(
      `SELECT
         ci.cart_item_id,
         ci.cart_id,
         ci.product_id,
         p.product_name,
         p.price,
         p.unit,
         ci.quantity
       FROM cart_items ci
       JOIN products p ON p.product_id = ci.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [cartId],
    );

    return { ...cart, items };
  }

  return {
    findById,

    async findByUserId(userId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT cart_id, user_id, created_at
         FROM carts
         WHERE user_id = ?
         LIMIT 1`,
        [userId],
      );
      return rows[0] ?? null;
    },

    async create({ userId }, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO carts (user_id)
         VALUES (?)`,
        [userId],
      );
      return findById(result.insertId, executor);
    },
  };
}
