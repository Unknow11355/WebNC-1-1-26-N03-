export function createCartRepository(db) {
  if (!db) throw new TypeError('Cart repository requires a database executor');

  async function findById(cartId, executor = db) {
    const [cartRows] = await executor.execute(
      `SELECT cart_id, user_id, created_at FROM carts WHERE cart_id = ? LIMIT 1`,
      [cartId],
    );
    const cart = cartRows[0] ?? null;
    if (!cart) return null;
    const [items] = await executor.execute(
      `SELECT ci.cart_item_id, ci.cart_id, ci.product_id,
              p.product_name, p.price, p.unit, p.stock, p.status, ci.quantity
       FROM cart_items ci JOIN products p ON p.product_id = ci.product_id
       WHERE ci.cart_id = ? ORDER BY ci.cart_item_id ASC`,
      [cartId],
    );
    return { ...cart, items };
  }

  return {
    findById,
    async findByUserId(userId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT cart_id, user_id, created_at FROM carts WHERE user_id = ? LIMIT 1`,
        [userId],
      );
      return rows[0] ?? null;
    },
    async create({ userId }, executor = db) {
      const [result] = await executor.execute(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
      return findById(result.insertId, executor);
    },
    async findItem(cartItemId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT ci.cart_item_id, ci.cart_id, ci.product_id, ci.quantity,
                p.product_name, p.price, p.stock, p.unit, p.status
         FROM cart_items ci JOIN products p ON p.product_id = ci.product_id
         WHERE ci.cart_item_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [cartItemId],
      );
      return rows[0] ?? null;
    },
    async findItemByCartAndProduct(cartId, productId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT cart_item_id, cart_id, product_id, quantity
         FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [cartId, productId],
      );
      return rows[0] ?? null;
    },
    async addItem({ cartId, productId, quantity }, executor = db) {
      await executor.execute(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [cartId, productId, quantity],
      );
      return findById(cartId, executor);
    },
    async updateItem(cartItemId, quantity, executor = db) {
      await executor.execute(`UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?`, [
        quantity,
        cartItemId,
      ]);
    },
    async removeItem(cartItemId, executor = db) {
      await executor.execute(`DELETE FROM cart_items WHERE cart_item_id = ?`, [cartItemId]);
    },
  };
}
