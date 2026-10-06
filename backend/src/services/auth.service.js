import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';

const SESSION_TTL_MS = 60 * 60 * 1000;

async function bcryptHash(password) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(password, 12);
}

async function bcryptCompare(password, hash) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.compare(password, hash);
}

function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

function validateRegisterInput(input) {
  const fullName = String(input?.full_name ?? input?.fullName ?? '').trim();
  const email = normalizeEmail(input?.email);
  const password = String(input?.password ?? '');
  const phone =
    input?.phone === null || input?.phone === undefined ? null : String(input.phone).trim();
  const address =
    input?.address === null || input?.address === undefined ? null : String(input.address).trim();
  const details = [];

  if (fullName.length < 2 || fullName.length > 100) {
    details.push({ field: 'full_name', issue: 'Độ dài phải từ 2 đến 100 ký tự' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.push({ field: 'email', issue: 'Email không hợp lệ' });
  }
  if (password.length < 8 || password.length > 72) {
    details.push({ field: 'password', issue: 'Mật khẩu phải từ 8 đến 72 ký tự' });
  }
  if (details.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu đăng ký không hợp lệ', details);
  }
  return { fullName, email, password, phone, address };
}

function publicUser(user) {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone ?? null,
    address: user.address ?? null,
    role_name: user.role_name,
    status: user.status,
  };
}

export function createAuthService({
  userRepository,
  sessionRepository,
  jwtSecret = process.env.JWT_SECRET,
  hashPassword = bcryptHash,
  verifyPassword = bcryptCompare,
} = {}) {
  if (!userRepository || !sessionRepository) {
    throw new TypeError('Auth service requires userRepository and sessionRepository');
  }
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 16) {
    throw new TypeError('JWT_SECRET must be configured with at least 16 characters');
  }

  async function issueToken(user) {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const accessToken = jwt.sign({ userId: user.user_id, email: user.email }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
      jwtid: jti,
    });
    await sessionRepository.create({ jti, userId: user.user_id, expiresAt });
    return accessToken;
  }

  return {
    async register(input) {
      const { fullName, email, password, phone, address } = validateRegisterInput(input);
      const existing = await userRepository.findByEmailForAuth(email);
      if (existing) throw new AppError(409, 'CONFLICT', 'Email đã được sử dụng');
      const role = await userRepository.findRoleByName('customer');
      if (!role)
        throw new AppError(500, 'INTERNAL_ERROR', 'Hệ thống chưa cấu hình vai trò khách hàng');
      const passwordHash = await hashPassword(password);
      const user = await userRepository.createCustomer({
        fullName,
        email,
        phone,
        address,
        passwordHash,
        roleId: role.role_id,
      });
      return publicUser(user);
    },

    async login({ email, password } = {}) {
      const normalizedEmail = normalizeEmail(email);
      const plainPassword = String(password ?? '');
      if (!normalizedEmail || !plainPassword) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Email và mật khẩu là bắt buộc', [
          { field: 'email', issue: 'Không được để trống' },
          { field: 'password', issue: 'Không được để trống' },
        ]);
      }
      const user = await userRepository.findByEmailForAuth(normalizedEmail);
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng');
      if (user.status === 'locked')
        throw new AppError(423, 'ACCOUNT_LOCKED', 'Tài khoản đang bị khóa');
      if (user.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không còn hoạt động');
      const ok = await verifyPassword(plainPassword, user.password_hash);
      if (!ok) throw new AppError(401, 'UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng');
      const accessToken = await issueToken(user);
      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        user: publicUser(user),
      };
    },

    async logout(sessionId) {
      if (!sessionId) throw new AppError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ');
      await sessionRepository.revoke(sessionId);
    },

    async me(userId) {
      const user = await userRepository.findById(userId);
      if (!user || user.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không còn hợp lệ');
      return publicUser(user);
    },

    async updateMe(userId, input) {
      const callerId = Number(userId);
      if (!Number.isSafeInteger(callerId) || callerId <= 0)
        throw new AppError(401, 'UNAUTHENTICATED', 'Danh tính không hợp lệ');
      if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length)
        throw new AppError(400, 'VALIDATION_ERROR', 'Cần ít nhất một trường hồ sơ');
      const allowed = ['full_name', 'phone', 'address'];
      if (Object.keys(input).some((key) => !allowed.includes(key)))
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Chỉ được cập nhật họ tên, điện thoại và địa chỉ',
        );
      const data = {};
      if (Object.hasOwn(input, 'full_name')) {
        if (
          typeof input.full_name !== 'string' ||
          input.full_name.trim().length < 2 ||
          input.full_name.trim().length > 100
        )
          throw new AppError(400, 'VALIDATION_ERROR', 'Họ tên phải từ 2 đến 100 ký tự');
        data.fullName = input.full_name.trim();
      }
      for (const key of ['phone', 'address']) {
        if (!Object.hasOwn(input, key)) continue;
        if (input[key] !== null && typeof input[key] !== 'string')
          throw new AppError(400, 'VALIDATION_ERROR', `${key} phải là chuỗi hoặc null`);
        const value = input[key]?.trim() || null;
        if (key === 'phone' && value !== null && !/^\+?[0-9]{8,15}$/.test(value))
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'Điện thoại gồm 8–15 chữ số, có thể bắt đầu bằng +',
          );
        if (key === 'address' && value !== null && value.length > 255)
          throw new AppError(400, 'VALIDATION_ERROR', 'Địa chỉ tối đa 255 ký tự');
        data[key] = value;
      }
      const current = await userRepository.findById(callerId);
      if (!current || current.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không còn hợp lệ');
      try {
        const user = await userRepository.updateUser(callerId, data);
        return publicUser(user);
      } catch (error) {
        if (error?.code === 'ER_DUP_ENTRY')
          throw new AppError(
            409,
            'CONFLICT',
            'Số điện thoại không khả dụng, vui lòng dùng số khác',
          );
        throw error;
      }
    },

    async listUsers({ limit, offset }) {
      const [rows, total] = await Promise.all([
        userRepository.listUsers({ limit, offset }),
        userRepository.countUsers(),
      ]);
      return { rows: rows.map(publicUser), total };
    },
  };
}
