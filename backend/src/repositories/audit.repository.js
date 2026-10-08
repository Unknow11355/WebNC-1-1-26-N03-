export function createAuditRepository(db) {
  if (!db) throw new TypeError('Audit repository requires a database executor');

  async function withConnection(work) {
    const connection = await db.getConnection();
    try {
      // audit.created_at is TIMESTAMP; use the contract timezone for date filters.
      await connection.execute("SET time_zone = '+07:00'");
      return await work(connection);
    } finally {
      connection.release();
    }
  }

  return {
    async create(
      {
        actorId = null,
        action,
        entityType = null,
        entityId = null,
        outcome,
        requestId = null,
        metadata = null,
      },
      executor = db,
    ) {
      await executor.execute(
        `INSERT INTO audit_logs
          (actor_id, action, entity_type, entity_id, outcome, request_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          actorId,
          action,
          entityType,
          entityId,
          outcome,
          requestId,
          metadata ? JSON.stringify(metadata) : null,
        ],
      );
    },

    async list({
      actorId = null,
      action = null,
      outcome = null,
      from = null,
      to = null,
      limit,
      offset,
    }) {
      return withConnection(async (executor) => {
        const conditions = ['1=1'];
        const params = [];
        if (actorId !== null) {
          conditions.push('a.actor_id = ?');
          params.push(actorId);
        }
        if (action !== null) {
          conditions.push('a.action = ?');
          params.push(action);
        }
        if (outcome !== null) {
          conditions.push('a.outcome = ?');
          params.push(outcome);
        }
        if (from !== null) {
          conditions.push('a.created_at >= ?');
          params.push(from);
        }
        if (to !== null) {
          conditions.push('a.created_at < ?');
          params.push(to);
        }
        const where = conditions.join(' AND ');
        const [rows] = await executor.execute(
          `SELECT a.audit_log_id, a.actor_id, u.full_name AS actor_name,
                  a.action, a.entity_type, a.entity_id, a.outcome,
                  a.request_id, a.created_at, a.metadata
           FROM audit_logs a
           LEFT JOIN users u ON u.user_id = a.actor_id
           WHERE ${where}
           ORDER BY a.created_at DESC, a.audit_log_id DESC
           LIMIT ? OFFSET ?`,
          [...params, String(limit), String(offset)],
        );
        const [counts] = await executor.execute(
          `SELECT COUNT(*) AS total FROM audit_logs a WHERE ${where}`,
          params,
        );
        return { rows, total: Number(counts[0].total) };
      });
    },
  };
}
