import { AppError } from '../errors/app-error.js';

function id(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function pagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page <= 0 ||
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > 20
  )
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
  return { page, limit, offset: (page - 1) * limit };
}

export function createNotificationService(repository) {
  if (!repository) throw new TypeError('Notification service requires repository');
  return {
    async list(auth, query) {
      const userId = id(auth?.userId, 'user_id');
      const p = pagination(query);
      const result = await repository.listForUser(userId, p);
      return {
        data: result.rows,
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },
    async markRead(auth, rawId) {
      const userId = id(auth?.userId, 'user_id');
      const notificationId = id(rawId, 'notification_id');
      const affected = await repository.markRead(userId, notificationId);
      if (!affected) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông báo');
      return { notification_id: notificationId, is_read: true };
    },
  };
}
