export function createPaymentRepository(db) {
  if (!db) throw new TypeError('Payment repository requires a database executor');

  return {
    async getOrderForPayment(orderId, executor = db) {
      const [rows] = await executor.execute(`SELECT * FROM orders WHERE order_id = ? LIMIT 1`, [
        orderId,
      ]);
      return rows[0] ?? null;
    },

    async insertPayment(orderId, method, amount, status, transactionId, executor = db) {
      // Tự động kiểm tra xem DB có cột transaction_id không để lưu tránh lỗi
      const [cols] = await executor.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'transaction_id'`,
      );
      if (cols.length > 0) {
        await executor.execute(
          `INSERT INTO payments (order_id, method, amount, status, transaction_id, paid_at) VALUES (?, ?, ?, ?, ?, IF(? = 'paid', NOW(), NULL))`,
          [orderId, method, amount, status, transactionId, status],
        );
      } else {
        await executor.execute(
          `INSERT INTO payments (order_id, method, amount, status, paid_at) VALUES (?, ?, ?, ?, IF(? = 'paid', NOW(), NULL))`,
          [orderId, method, amount, status, status],
        );
      }
    },

    async markOrderPaid(orderId, transactionId, gateway = 'vnpay', executor = db) {
      const order = await this.getOrderForPayment(orderId, executor);
      if (!order) return { ok: false, message: 'Order not found' };

      // CHỐNG DOUBLE PAYMENT (Yêu cầu quan trọng của CN12)
      if (['paid', 'success'].includes(String(order.payment_status).toLowerCase())) {
        return { ok: true, alreadyPaid: true, order };
      }

      const setParts = ["payment_status = 'paid'", 'payment_method = ?', "status = 'completed'"];
      const params = [gateway];

      const [cols] = await executor.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transaction_id'`,
      );
      if (cols.length > 0) {
        setParts.push('transaction_id = ?');
        params.push(transactionId);
      }
      params.push(orderId);

      await executor.execute(`UPDATE orders SET ${setParts.join(', ')} WHERE order_id = ?`, params);
      await this.insertPayment(
        orderId,
        gateway,
        order.final_amount,
        'paid',
        transactionId,
        executor,
      );

      return { ok: true, alreadyPaid: false, order };
    },

    async markOrderFailed(orderId, transactionId, gateway = 'vnpay', executor = db) {
      const order = await this.getOrderForPayment(orderId, executor);
      if (!order) return { ok: false };

      if (['paid', 'success'].includes(String(order.payment_status).toLowerCase())) {
        return { ok: true, alreadyPaid: true, order };
      }

      await executor.execute(`UPDATE orders SET payment_status = 'failed' WHERE order_id = ?`, [
        orderId,
      ]);
      await this.insertPayment(
        orderId,
        gateway,
        order.final_amount,
        'failed',
        transactionId,
        executor,
      );

      return { ok: true, order };
    },
  };
}
