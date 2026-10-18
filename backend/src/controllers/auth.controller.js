import { AppError } from '../errors/app-error.js';
import {
  readSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../middlewares/session-cookie.js';

export function createAuthController(service) {
  if (!service) throw new TypeError('Auth controller requires service');

  return {
    async register(req, res) {
      res.status(201).json({ success: true, data: await service.register(req.body) });
    },
    async login(req, res) {
      const cookieMode = req.get('x-session-mode') === 'cookie';
      const data = await service.login(
        req.body,
        req.traceId,
        cookieMode ? readSessionCookie(req) : null,
      );
      res.setHeader('Cache-Control', 'no-store');
      if (cookieMode) {
        setSessionCookie(res, data.access_token);
        res
          .status(200)
          .json({ success: true, data: { user: data.user, expires_in: data.expires_in } });
      } else {
        res.status(200).json({ success: true, data });
      }
    },
    async logout(req, res) {
      await service.logout(req.sessionId);
      clearSessionCookie(res);
      res.setHeader('Cache-Control', 'no-store');
      res.status(204).send();
    },
    async me(req, res) {
      res.status(200).json({ success: true, data: await service.me(req.auth.userId) });
    },
    async updateMe(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.updateMe(req.auth.userId, req.body) });
    },
    async changePassword(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.changePassword(req.auth.userId, req.body) });
    },
    async requestPasswordReset(req, res) {
      res.status(202).json({ success: true, data: await service.requestPasswordReset(req.body) });
    },
    async confirmPasswordReset(req, res) {
      res.status(200).json({ success: true, data: await service.confirmPasswordReset(req.body) });
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
      )
        throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
      const result = await service.listUsers({ limit, offset: (page - 1) * limit });
      res.status(200).json({
        success: true,
        data: result.rows,
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
      });
    },
  };
}
