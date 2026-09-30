import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';

const DEFAULT_JWT_SECRET = 'super_secret_key_demo';

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

export function createAuthMiddleware({
  userRepository,
  jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
} = {}) {
  if (!userRepository) {
    throw new TypeError('Auth middleware requires userRepository');
  }

  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new TypeError('Auth middleware requires JWT secret');
  }

  async function requireAuth(req, res, next) {
    try {
      const token = parseBearerToken(req.get('authorization'));

      if (!token) {
        throw new AppError(401, 'UNAUTHORIZED', 'Thiếu Bearer token');
      }

      const payload = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
      });
      const userId = parseUserId(payload.userId);
      const user = await userRepository.findById(userId);

      if (!user || user.status !== 'active') {
        throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn hợp lệ');
      }

      // Đây là hợp đồng V4 mà Kiên đang dùng: các tầng sau chỉ đọc req.auth.
      req.auth = {
        userId,
        role: user.role_name,
      };

      return next();
    } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(new AppError(401, 'UNAUTHORIZED', 'Token không hợp lệ hoặc đã hết hạn'));
    }
  }

  function requireRole(...allowedRoles) {
    if (allowedRoles.length === 0 || allowedRoles.some((role) => typeof role !== 'string')) {
      throw new TypeError('requireRole requires at least one role name');
    }

    return (req, res, next) => {
      if (!req.auth) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Chưa xác thực'));
      }

      if (!allowedRoles.includes(req.auth.role)) {
        return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'));
      }

      return next();
    };
  }

  function requireRoles(allowedRoles) {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      throw new TypeError('requireRoles requires a non-empty array');
    }

    return requireRole(...allowedRoles);
  }

  return {
    requireAuth,
    requireRole,
    requireRoles,
  };
}
