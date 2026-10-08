export function createReportRepository(db) {
  if (!db) throw new TypeError('Report repository requires a database executor');

  async function withConnection(work, executor) {
    if (executor) {
      await executor.execute("SET time_zone = '+07:00'");
      return work(executor, false);
    }
    const connection = await db.getConnection();
    try {
      await connection.execute("SET time_zone = '+07:00'");
      return await work(connection, true);
    } finally {
      connection.release();
    }
  }

  return {
    async revenue({ fromTimestamp: from, toTimestamp: to }, executor = null) {
      return withConnection(async (connection) => {
        const [summary] = await connection.execute(
          `SELECT COUNT(*) AS order_count,
                  COALESCE(SUM(o.final_amount), 0) AS revenue,
                  COALESCE(SUM(o.discount_amount), 0) AS discount_amount
           FROM orders o
           INNER JOIN (
             SELECT order_id, SUM(amount) AS paid_amount
             FROM payments
             WHERE status = 'paid'
             GROUP BY order_id
           ) p ON p.order_id = o.order_id
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL`,
          [from, to],
        );
        const [series] = await connection.execute(
          `SELECT DATE(o.paid_at) AS report_date,
                  COUNT(*) AS order_count,
                  COALESCE(SUM(o.final_amount), 0) AS revenue,
                  COALESCE(SUM(o.discount_amount), 0) AS discount_amount
           FROM orders o
           INNER JOIN (
             SELECT order_id, SUM(amount) AS paid_amount
             FROM payments
             WHERE status = 'paid'
             GROUP BY order_id
           ) p ON p.order_id = o.order_id
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
           GROUP BY DATE(o.paid_at)
           ORDER BY report_date ASC`,
          [from, to],
        );
        return { summary: summary[0], series };
      }, executor);
    },

    async products({ fromTimestamp: from, toTimestamp: to }, executor = null) {
      return withConnection(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT p.product_id,
                  p.product_name,
                  p.barcode,
                  COALESCE(SUM(oi.quantity), 0) AS quantity,
                  COALESCE(SUM(oi.quantity * oi.price), 0) AS line_sales
           FROM order_items oi
           INNER JOIN orders o ON o.order_id = oi.order_id
           INNER JOIN products p ON p.product_id = oi.product_id
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
           GROUP BY p.product_id, p.product_name, p.barcode
           ORDER BY line_sales DESC, p.product_id ASC`,
          [from, to],
        );
        return rows;
      }, executor);
    },

    async employees({ fromTimestamp: from, toTimestamp: to }, executor = null) {
      return withConnection(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT o.employee_id,
                  COALESCE(u.full_name, 'Chưa gán nhân viên') AS employee_name,
                  COUNT(*) AS order_count,
                  COALESCE(SUM(o.final_amount), 0) AS revenue
           FROM orders o
           LEFT JOIN users u ON u.user_id = o.employee_id
           INNER JOIN (
             SELECT order_id, SUM(amount) AS paid_amount
             FROM payments
             WHERE status = 'paid'
             GROUP BY order_id
           ) p ON p.order_id = o.order_id
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
           GROUP BY o.employee_id, u.full_name
           ORDER BY revenue DESC, o.employee_id ASC`,
          [from, to],
        );
        return rows;
      }, executor);
    },
  };
}
