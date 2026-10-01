import { AppError } from '../errors/app-error.js';

export function createAuthController(service) {
  if (!service) throw new TypeError('Auth controller requires service');

  return {
    async register(req, res) {
      res.status(201).json({ success: true, data: await service.register(req.body) });
    },
    async login(req, res) {
      res.status(200).json({ success: true, data: await service.login(req.body) });
    },
    async logout(req, res) {
      await service.logout(req.sessionId);
      res.status(204).send();
    },
    async me(req, res) {
      res.status(200).json({ success: true, data: await service.me(req.auth.userId) });
    },
    async listUsers(req, res) {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      if (
        !Number.isInteger(page) ||
        page <= 0 ||
        !Number.isInteger(limit) ||
        limit <= 0 ||
        limit > 20
      ) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
      }
      const result = await service.listUsers({ limit, offset: (page - 1) * limit });
      res.status(200).json({
        success: true,
        data: result.rows,
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
      });
    },
  };
}
