export function createPosRepository(db) {
  if (!db) throw new TypeError('POS repository requires a database executor');

  return {
    async createSaleRequest({ actorId, operation, requestKey, requestHash }, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO sale_requests
          (actor_id, operation, request_key, request_hash, order_id)
         VALUES (?, ?, ?, ?, NULL)`,
        [actorId, operation, requestKey, requestHash],
      );
      return { sale_request_id: result.insertId };
    },

    async findSaleRequest(actorId, operation, requestKey, executor = db) {
      const [rows] = await executor.execute(
        `SELECT sale_request_id, actor_id, operation, request_key, request_hash,
                order_id, created_at
         FROM sale_requests
         WHERE actor_id = ? AND operation = ? AND request_key = ?
         LIMIT 1`,
        [actorId, operation, requestKey],
      );
      return rows[0] ?? null;
    },

    async findCustomer(customerId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT u.user_id, u.full_name, u.status, r.role_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = ?
         LIMIT 1`,
        [customerId],
      );
      return rows[0] ?? null;
    },

    async findCurrentShift(employeeId, executor = db) {
      // Same lock as CN09: a sale and shift closure have an unambiguous order.
      await executor.execute('SELECT user_id FROM users WHERE user_id=? FOR UPDATE', [employeeId]);
      const [rows] = await executor.execute(
        `SELECT shift_id
         FROM work_shifts
         WHERE employee_id = ?
           AND status IN ('active','working','open')
           AND TIMESTAMP(shift_date,start_time) <= UTC_TIMESTAMP() + INTERVAL 7 HOUR
           AND end_time IS NULL
         ORDER BY start_time DESC, shift_id DESC
         LIMIT 1 FOR UPDATE`,
        [employeeId],
      );
      return rows[0]?.shift_id ?? null;
    },

    async findProductForUpdate(productId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT product_id, product_name, barcode, price, unit, stock,
                min_stock, category_id, status
         FROM products
         WHERE product_id = ?
         LIMIT 1
         FOR UPDATE`,
        [productId],
      );
      return rows[0] ?? null;
    },

    async decrementProductStock(productId, quantity, executor = db) {
      const [result] = await executor.execute(
        `UPDATE products
         SET stock = stock - ?
         WHERE product_id = ?
           AND status = 'active'
           AND stock >= ?`,
        [quantity, productId, quantity],
      );
      return result.affectedRows;
    },

    async createOfflineOrder(
      { employeeId, customerId, shiftId, totalAmount, discountAmount, finalAmount, paidAt, note },
      executor = db,
    ) {
      const [result] = await executor.execute(
        `INSERT INTO orders
          (customer_id, employee_id, shift_id, voucher_id,
           order_type, delivery_method, total_amount, discount_amount,
           points_used, points_earned, points_discount, final_amount,
           payment_method, status, payment_status, transaction_id,
           paid_at, order_status, shipping_address, confirmed_by,
           confirmed_at, rejection_reason, note)
         VALUES
          (?, ?, ?, NULL,
           'offline', 'pickup', ?, ?, 0, 0, 0, ?,
           'cash', 'completed', 'paid', NULL,
           ?, 'completed', NULL, ?, ?, NULL, ?)`,
        [
          customerId,
          employeeId,
          shiftId,
          totalAmount,
          discountAmount,
          finalAmount,
          paidAt,
          employeeId,
          paidAt,
          note,
        ],
      );
      return result.insertId;
    },

    async createOrderItem({ orderId, productId, quantity, price, subtotal }, executor = db) {
      await executor.execute(
        `INSERT INTO order_items
          (order_id, product_id, quantity, price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, productId, quantity, price, subtotal],
      );
    },

    async createPayment({ orderId, amount, paidAt }, executor = db) {
      await executor.execute(
        `INSERT INTO payments
          (order_id, method, amount, status, transaction_id, paid_at)
         VALUES (?, 'cash', ?, 'paid', NULL, ?)`,
        [orderId, amount, paidAt],
      );
    },

    async updateSaleRequestOrderId(saleRequestId, orderId, executor = db) {
      await executor.execute(
        `UPDATE sale_requests
         SET order_id = ?
         WHERE sale_request_id = ?`,
        [orderId, saleRequestId],
      );
    },

    async findOrderForReplay(orderId, actorId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT order_id, customer_id, employee_id, shift_id, order_type,
                delivery_method, total_amount, discount_amount, final_amount,
                payment_method, status, payment_status, order_status,
                paid_at, confirmed_by, confirmed_at, note, created_at
         FROM orders
         WHERE order_id = ? AND employee_id = ?
         LIMIT 1`,
        [orderId, actorId],
      );
      return rows[0] ?? null;
    },

    async findOrderItems(orderId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT oi.order_item_id, oi.product_id, p.product_name,
                oi.quantity, oi.price, oi.subtotal
         FROM order_items oi
         JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = ?
         ORDER BY oi.order_item_id ASC`,
        [orderId],
      );
      return rows;
    },
  };
}
