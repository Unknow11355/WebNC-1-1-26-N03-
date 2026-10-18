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
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM payments p
               WHERE p.order_id = o.order_id
                 AND p.status = 'paid'
             )`,
          [from, to],
        );
        const [series] = await connection.execute(
          `SELECT DATE(o.paid_at) AS report_date,
                  COUNT(*) AS order_count,
                  COALESCE(SUM(o.final_amount), 0) AS revenue,
                  COALESCE(SUM(o.discount_amount), 0) AS discount_amount
           FROM orders o
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM payments p
               WHERE p.order_id = o.order_id
                 AND p.status = 'paid'
             )
           GROUP BY DATE(o.paid_at)
           ORDER BY report_date ASC`,
          [from, to],
        );
        const [quality] = await connection.execute(
          `SELECT COUNT(*) AS paid_without_paid_at
           FROM orders o
           WHERE o.payment_status = 'paid'
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NULL
             AND EXISTS (
               SELECT 1
               FROM payments p
               WHERE p.order_id = o.order_id
                 AND p.status = 'paid'
             )`,
        );
        return { summary: summary[0], series, data_quality: quality[0] };
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
           WHERE o.payment_status = 'paid'
             AND o.paid_at >= ?
             AND o.paid_at < ?
             AND o.status NOT IN ('cancelled', 'rejected')
             AND o.paid_at IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM payments p
               WHERE p.order_id = o.order_id
                 AND p.status = 'paid'
             )
           GROUP BY o.employee_id, u.full_name
           ORDER BY revenue DESC, o.employee_id ASC`,
          [from, to],
        );
        return rows;
      }, executor);
    },

    async employeeActivity(
      employeeId,
      { fromTimestamp: from, toTimestamp: to, limit, offset },
      executor = null,
    ) {
      return withConnection(async (connection) => {
        const [[employeeRows], [orders], [orderCounts], [shifts], [shiftCounts]] =
          await Promise.all([
            connection.execute(
              `SELECT u.user_id, u.full_name, u.email, u.status, u.employment_type
             FROM users u JOIN roles r ON r.role_id = u.role_id
             WHERE u.user_id = ? AND r.role_name = 'employee' LIMIT 1`,
              [employeeId],
            ),
            connection.execute(
              `SELECT o.order_id, o.order_type, o.status, o.payment_status,
                    o.total_amount, o.discount_amount, o.points_discount, o.final_amount,
                    o.payment_method, o.shift_id,
                    COALESCE(o.confirmed_at, o.paid_at, o.created_at) AS handled_at,
                    o.rejection_reason
             FROM orders o
             WHERE o.employee_id = ?
               AND COALESCE(o.confirmed_at, o.paid_at, o.created_at) >= ?
               AND COALESCE(o.confirmed_at, o.paid_at, o.created_at) < ?
             ORDER BY handled_at DESC, o.order_id DESC
             LIMIT ? OFFSET ?`,
              [employeeId, from, to, String(limit), String(offset)],
            ),
            connection.execute(
              `SELECT COUNT(*) AS total FROM orders o
             WHERE o.employee_id = ?
               AND COALESCE(o.confirmed_at, o.paid_at, o.created_at) >= ?
               AND COALESCE(o.confirmed_at, o.paid_at, o.created_at) < ?`,
              [employeeId, from, to],
            ),
            connection.execute(
              `SELECT shift_id, DATE_FORMAT(shift_date, '%Y-%m-%d') AS shift_date,
                    start_time, end_time, status,
                    DATE_FORMAT(ended_at, '%Y-%m-%d %H:%i:%s') AS ended_at, note
             FROM work_shifts
             WHERE employee_id = ? AND shift_date >= ? AND shift_date < ?
             ORDER BY shift_date DESC, start_time DESC, shift_id DESC`,
              [employeeId, from.slice(0, 10), to.slice(0, 10)],
            ),
            connection.execute(
              `SELECT COUNT(*) AS total FROM work_shifts
             WHERE employee_id = ? AND shift_date >= ? AND shift_date < ?`,
              [employeeId, from.slice(0, 10), to.slice(0, 10)],
            ),
          ]);
        return {
          employee: employeeRows[0] ?? null,
          orders,
          orderTotal: Number(orderCounts[0]?.total ?? 0),
          shifts,
          shiftTotal: Number(shiftCounts[0]?.total ?? 0),
        };
      }, executor);
    },
  };
}
