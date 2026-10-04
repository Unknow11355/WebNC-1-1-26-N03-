export function createOrderRepository(db) {
  if (!db) throw new TypeError('Order repository requires a database executor');

  return {
    async findCartByCustomerForUpdate(customerId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT cart_id, user_id FROM carts WHERE user_id = ? LIMIT 1 FOR UPDATE`,
        [customerId],
      );
      return rows[0] ?? null;
    },
    async findById(orderId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT order_id, customer_id, employee_id, shift_id, voucher_id,
                order_type, delivery_method, total_amount, discount_amount, final_amount,
                payment_method, status, payment_status, transaction_id, paid_at,
                order_status, shipping_address, confirmed_by, confirmed_at,
                rejection_reason, note, created_at, updated_at
         FROM orders WHERE order_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [orderId],
      );
      return rows[0] ?? null;
    },
    async createOrder(data, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO orders
          (customer_id, voucher_id, order_type, delivery_method, total_amount,
           discount_amount, points_used, points_earned, points_discount, final_amount,
           payment_method, status, payment_status, order_status, shipping_address, note)
         VALUES (?, ?, 'online', ?, ?, ?, 0, 0, 0, ?, ?, 'pending', 'pending', 'pending', ?, ?)`,
        [
          data.customerId,
          data.voucherId,
          data.deliveryMethod,
          data.totalAmount,
          data.discountAmount,
          data.finalAmount,
          data.paymentMethod,
          data.shippingAddress,
          data.note,
        ],
      );
      return this.findById(result.insertId, executor);
    },
    async createOrderItem(data, executor = db) {
      await executor.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [data.orderId, data.productId, data.quantity, data.price, data.subtotal],
      );
    },
    async createPayment(data, executor = db) {
      await executor.execute(
        `INSERT INTO payments (order_id, method, amount, status, transaction_id)
         VALUES (?, ?, ?, ?, ?)`,
        [data.orderId, data.method, data.amount, data.status, data.transactionId],
      );
    },
    async updateStatus(orderId, data, executor = db) {
      const fields = [];
      const params = [];
      for (const [field, column] of [
        ['status', 'status'],
        ['orderStatus', 'order_status'],
        ['paymentStatus', 'payment_status'],
        ['employeeId', 'employee_id'],
        ['confirmedAt', 'confirmed_at'],
        ['rejectionReason', 'rejection_reason'],
        ['paidAt', 'paid_at'],
      ]) {
        if (data[field] !== undefined) {
          fields.push(`${column} = ?`);
          params.push(data[field]);
        }
      }
      params.push(orderId);
      await executor.execute(`UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`, params);
      return this.findById(orderId, executor);
    },
    async listByCustomer(customerId, { limit, offset }, executor = db) {
      const [rows] = await executor.execute(
        `SELECT order_id, customer_id, order_type, delivery_method, total_amount,
                discount_amount, final_amount, payment_method, status, payment_status,
                order_status, created_at
         FROM orders WHERE customer_id = ? ORDER BY created_at DESC, order_id DESC LIMIT ? OFFSET ?`,
        [customerId, String(limit), String(offset)],
      );
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?`,
        [customerId],
      );
      return { rows, total: Number(counts[0].total) };
    },
    async listAll({ limit, offset, status = null }, executor = db) {
      const params = [];
      const where = status ? 'WHERE status = ?' : '';
      if (status) params.push(status);
      const [rows] = await executor.execute(
        `SELECT order_id, customer_id, order_type, delivery_method, total_amount,
                discount_amount, final_amount, payment_method, status, payment_status,
                order_status, created_at
         FROM orders ${where} ORDER BY created_at DESC, order_id DESC LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)],
      );
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM orders ${where}`,
        params,
      );
      return { rows, total: Number(counts[0].total) };
    },
    async getItems(orderId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT oi.order_item_id, oi.order_id, oi.product_id, p.product_name,
                oi.quantity, oi.price, oi.subtotal
         FROM order_items oi JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = ? ORDER BY oi.order_item_id ASC${lock ? ' FOR UPDATE' : ''}`,
        [orderId],
      );
      return rows;
    },
    async getCartItemsForUpdate(cartId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT ci.cart_item_id, ci.product_id, ci.quantity,
                p.product_name, p.price, p.stock, p.status
         FROM cart_items ci JOIN products p ON p.product_id = ci.product_id
         WHERE ci.cart_id = ? ORDER BY ci.cart_item_id ASC FOR UPDATE`,
        [cartId],
      );
      return rows;
    },
    async clearCart(cartId, executor = db) {
      await executor.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
    },
    async incrementProductStock(productId, quantity, executor = db) {
      await executor.execute(`UPDATE products SET stock = stock + ? WHERE product_id = ?`, [
        quantity,
        productId,
      ]);
    },
    async decrementProductStock(productId, quantity, executor = db) {
      const [result] = await executor.execute(
        `UPDATE products SET stock = stock - ?
         WHERE product_id = ? AND stock >= ? AND status = 'active'`,
        [quantity, productId, quantity],
      );
      if (result.affectedRows !== 1) throw new Error('PRODUCT_STOCK_UPDATE_FAILED');
    },
    async updatePaymentStatus(orderId, status, paidAt = null, executor = db) {
      await executor.execute(`UPDATE payments SET status = ?, paid_at = ? WHERE order_id = ?`, [
        status,
        paidAt,
        orderId,
      ]);
    },
  };
}
