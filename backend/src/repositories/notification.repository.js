export function createNotificationRepository(db) {
  if (!db) throw new TypeError('Notification repository requires a database executor');
  return {
    async createEvent(
      { recipientUserId, orderId = null, eventKey, title, message, type = 'order' },
      executor = db,
    ) {
      const [result] = await executor.execute(
        `INSERT IGNORE INTO notifications
          (recipient_user_id, order_id, event_key, title, message, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
        [recipientUserId, orderId, eventKey, title, message, type],
      );
      return result.affectedRows === 1;
    },

    async listForUser(userId, { limit, offset }, executor = db) {
      const [rows] = await executor.execute(
        `SELECT notification_id, order_id, title, message, type, is_read, created_at
         FROM notifications
         WHERE recipient_user_id = ?
         ORDER BY created_at DESC, notification_id DESC
         LIMIT ? OFFSET ?`,
        [userId, String(limit), String(offset)],
      );
      const [counts] = await executor.execute(
        `SELECT COUNT(*) AS total FROM notifications WHERE recipient_user_id = ?`,
        [userId],
      );
      return { rows, total: Number(counts[0].total) };
    },

    async markRead(userId, notificationId, executor = db) {
      const [result] = await executor.execute(
        `UPDATE notifications SET is_read = TRUE
         WHERE notification_id = ? AND recipient_user_id = ?`,
        [notificationId, userId],
      );
      return result.affectedRows;
    },
  };
}
