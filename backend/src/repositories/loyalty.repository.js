export function createLoyaltyRepository(db) {
  if (!db) throw new TypeError('Loyalty repository requires a database executor');

  const memberColumns = `
    u.user_id, u.full_name, u.email, u.phone, u.address,
    u.points, u.membership_code, u.status, u.created_at,
    r.role_name`;

  async function findCustomerById(customerId, executor = db, lock = false) {
    const [rows] = await executor.execute(
      `SELECT ${memberColumns}
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ? AND r.role_name = 'customer'
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [customerId],
    );
    return rows[0] ?? null;
  }

  return {
    findCustomerById,

    async searchCustomers({ q = '', limit, offset }, executor = db) {
      const pattern = `%${q}%`;
      const [rows] = await executor.execute(
        `SELECT ${memberColumns}
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE r.role_name = 'customer'
           AND u.status = 'active'
           AND (
             u.membership_code LIKE ?
             OR CONCAT('MEM', LPAD(u.user_id, 8, '0')) LIKE ?
             OR u.email LIKE ?
             OR u.phone LIKE ?
             OR u.full_name LIKE ?
           )
         ORDER BY u.user_id ASC
         LIMIT ? OFFSET ?`,
        [pattern, pattern, pattern, pattern, pattern, String(limit), String(offset)],
      );

      const [countRows] = await executor.execute(
        `SELECT COUNT(*) AS total
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE r.role_name = 'customer'
           AND u.status = 'active'
           AND (
             u.membership_code LIKE ?
             OR CONCAT('MEM', LPAD(u.user_id, 8, '0')) LIKE ?
             OR u.email LIKE ?
             OR u.phone LIKE ?
             OR u.full_name LIKE ?
           )`,
        [pattern, pattern, pattern, pattern, pattern],
      );

      return { rows, total: Number(countRows[0]?.total ?? 0) };
    },

    async listHistory(customerId, { limit, offset }, executor = db) {
      const [rows] = await executor.execute(
        `SELECT lt.loyalty_id, lt.user_id, lt.order_id, lt.points_change,
                lt.type, lt.note, lt.created_at,
                o.status AS order_status,
                o.payment_status,
                o.final_amount
         FROM loyalty_transactions lt
         LEFT JOIN orders o ON o.order_id = lt.order_id
         WHERE lt.user_id = ?
         ORDER BY lt.created_at DESC, lt.loyalty_id DESC
         LIMIT ? OFFSET ?`,
        [customerId, String(limit), String(offset)],
      );
      const [countRows] = await executor.execute(
        `SELECT COUNT(*) AS total FROM loyalty_transactions WHERE user_id = ?`,
        [customerId],
      );
      return { rows, total: Number(countRows[0]?.total ?? 0) };
    },

    async findTransactionByOrderType(orderId, type, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT loyalty_id, user_id, order_id, points_change, type, note, created_at
         FROM loyalty_transactions
         WHERE order_id = ? AND type = ?
         LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [orderId, type],
      );
      return rows[0] ?? null;
    },

    async createTransaction({ userId, orderId, pointsChange, type, note }, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO loyalty_transactions
          (user_id, order_id, points_change, type, note)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, orderId, pointsChange, type, note],
      );
      return result.insertId;
    },

    async incrementPoints(userId, points, executor = db) {
      const [result] = await executor.execute(
        `UPDATE users
         SET points = points + ?
         WHERE user_id = ?
           AND points <= 2147483647 - ?`,
        [points, userId, points],
      );
      return result.affectedRows;
    },

    async decrementPoints(userId, points, executor = db) {
      const [result] = await executor.execute(
        `UPDATE users
         SET points = points - ?
         WHERE user_id = ? AND points >= ?`,
        [points, userId, points],
      );
      return result.affectedRows;
    },

    async updateOrderPoints(orderId, data, executor = db) {
      const fields = [];
      const params = [];
      for (const [key, column] of [
        ['pointsUsed', 'points_used'],
        ['pointsEarned', 'points_earned'],
        ['pointsDiscount', 'points_discount'],
      ]) {
        if (data[key] !== undefined) {
          fields.push(`${column} = ?`);
          params.push(data[key]);
        }
      }
      if (!fields.length) return;
      params.push(orderId);
      await executor.execute(`UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`, params);
    },
  };
}
