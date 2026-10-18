export function createPaymentRepository(db) {
  if (!db) throw new TypeError('Payment repository requires a database executor');

  return {
    async getOrderForPayment(orderId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT order_id, customer_id, final_amount, status, order_status,
                payment_status, payment_method, transaction_id, paid_at
         FROM orders WHERE order_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [orderId],
      );
      return rows[0] ?? null;
    },

    async createVnpayAttempt(orderId, transactionId, amount, executor = db) {
      const [pending] = await executor.execute(
        `SELECT payment_id
         FROM payments
         WHERE order_id = ? AND method = 'vnpay'
           AND status = 'pending' AND transaction_id IS NULL
         ORDER BY payment_id ASC LIMIT 1 FOR UPDATE`,
        [orderId],
      );
      if (pending[0]) {
        await executor.execute(
          `UPDATE payments
           SET transaction_id = ?, amount = ?
           WHERE payment_id = ? AND transaction_id IS NULL`,
          [transactionId, amount, pending[0].payment_id],
        );
        return Number(pending[0].payment_id);
      }

      const [result] = await executor.execute(
        `INSERT INTO payments (order_id, method, amount, status, transaction_id)
         VALUES (?, 'vnpay', ?, 'pending', ?)`,
        [orderId, amount, transactionId],
      );
      return Number(result.insertId);
    },

    async findVnpayAttempt(orderId, transactionId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT payment_id, order_id, amount, status, transaction_id
         FROM payments
         WHERE order_id = ? AND method = 'vnpay' AND transaction_id = ?
         LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [orderId, transactionId],
      );
      return rows[0] ?? null;
    },

    async markOrderPaid(order, attempt, transactionId, gateway = 'vnpay', executor = db) {
      const [paymentResult] = await executor.execute(
        `UPDATE payments
         SET status = 'paid', paid_at = CURRENT_TIMESTAMP
         WHERE payment_id = ? AND status = 'pending'`,
        [attempt.payment_id],
      );
      if (paymentResult.affectedRows !== 1) return { ok: false, alreadyPaid: true, order };

      const [orderResult] = await executor.execute(
        `UPDATE orders
         SET payment_status = 'paid', payment_method = ?, transaction_id = ?,
             paid_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND payment_status <> 'paid'
           AND status NOT IN ('cancelled', 'rejected')
           AND order_status NOT IN ('cancelled', 'rejected')`,
        [gateway, transactionId, order.order_id],
      );
      if (orderResult.affectedRows !== 1) {
        throw new Error('PAYMENT_ORDER_STATE_CHANGED');
      }
      return { ok: true, alreadyPaid: false };
    },

    async markOrderFailed(order, attempt, executor = db) {
      const [paymentResult] = await executor.execute(
        `UPDATE payments SET status = 'failed'
         WHERE payment_id = ? AND status = 'pending'`,
        [attempt.payment_id],
      );
      if (paymentResult.affectedRows !== 1) return { ok: true, alreadyProcessed: true };

      await executor.execute(
        `UPDATE orders SET payment_status = 'failed'
         WHERE order_id = ? AND payment_status <> 'paid'
           AND status NOT IN ('cancelled', 'rejected')
           AND order_status NOT IN ('cancelled', 'rejected')`,
        [order.order_id],
      );
      return { ok: true, alreadyProcessed: false };
    },
  };
}
