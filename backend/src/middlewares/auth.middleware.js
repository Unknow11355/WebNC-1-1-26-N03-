import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';

function parseBearerToken(header) {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return match?.[1] ?? null;
}

function parseUserId(value) {
  const userId = Number(value);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token không chứa danh tính hợp lệ');
  }
  return userId;
}

export function createAuthMiddleware({ userRepository, sessionRepository, jwtSecret } = {}) {
  if (!userRepository || !sessionRepository)
    throw new TypeError('Auth middleware requires repositories');
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 16) {
    throw new TypeError('Auth middleware requires JWT_SECRET with at least 16 characters');
  }

  async function requireAuth(req, res, next) {
    try {
      const token = parseBearerToken(req.get('authorization'));
      if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Thiếu Bearer token');
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      const userId = parseUserId(payload.userId);
      if (!payload.jti) throw new AppError(401, 'UNAUTHORIZED', 'Token thiếu mã phiên');
      const session = await sessionRepository.findActiveById(payload.jti);
      if (!session || Number(session.user_id) !== userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không còn hợp lệ');
      }
      const user = await userRepository.findById(userId);
      if (!user || user.status !== 'active')
        throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn hợp lệ');
      req.auth = { userId, role: user.role_name };
      req.sessionId = payload.jti;
      return next();
    } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(new AppError(401, 'UNAUTHORIZED', 'Token không hợp lệ hoặc đã hết hạn'));
    }
  }

  function requireRole(...allowedRoles) {
    if (!allowedRoles.length || allowedRoles.some((role) => typeof role !== 'string')) {
      throw new TypeError('requireRole requires role names');
    }
    return (req, res, next) => {
      if (!req.auth) return next(new AppError(401, 'UNAUTHORIZED', 'Chưa xác thực'));
      if (!allowedRoles.includes(req.auth.role))
        return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'));
      return next();
    };
  }

  function requireRoles(allowedRoles) {
    if (!Array.isArray(allowedRoles) || !allowedRoles.length)
      throw new TypeError('requireRoles requires a non-empty array');
    return requireRole(...allowedRoles);
  }

  return { requireAuth, requireRole, requireRoles };
}
