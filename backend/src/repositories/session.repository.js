export function createSessionRepository(db) {
  if (!db) throw new TypeError('Session repository requires a database executor');

  return {
    async create({ jti, userId, expiresAt }, executor = db) {
      await executor.execute("SET time_zone = '+07:00'");
      await executor.execute(
        `INSERT INTO user_sessions (session_id, user_id, expires_at)
         VALUES (?, ?, ?)`,
        [jti, userId, expiresAt],
      );
    },

    async findActiveById(sessionId, executor = db) {
      await executor.execute("SET time_zone = '+07:00'");
      const [rows] = await executor.execute(
        `SELECT session_id, user_id, expires_at, revoked_at
         FROM user_sessions
         WHERE session_id = ?
           AND revoked_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
        [sessionId],
      );
      return rows[0] ?? null;
    },

    async revoke(sessionId, executor = db) {
      await executor.execute("SET time_zone = '+07:00'");
      const [result] = await executor.execute(
        `UPDATE user_sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE session_id = ? AND revoked_at IS NULL`,
        [sessionId],
      );
      return result.affectedRows;
    },

    async revokeAllForUser(userId, executor = db) {
      await executor.execute("SET time_zone = '+07:00'");
      const [result] = await executor.execute(
        `UPDATE user_sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND revoked_at IS NULL`,
        [userId],
      );
      return result.affectedRows;
    },
  };
}
