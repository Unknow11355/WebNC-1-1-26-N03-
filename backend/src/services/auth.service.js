import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import { safeAudit } from './audit.service.js';

const SESSION_TTL_MS = 60 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const RESET_RATE_WINDOW_MS = 10 * 60 * 1000;
const RESET_RATE_MAX = 3;
const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';
const resetAttempts = new Map();

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

function password(value) {
  const valueString = String(value ?? '');
  if (valueString.length < 8 || valueString.length > 72)
    throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu phải từ 8 đến 72 ký tự');
  return valueString;
}

function validateRegisterInput(input) {
  const fullName = String(input?.full_name ?? input?.fullName ?? '').trim();
  const email = normalizeEmail(input?.email);
  const pwd = password(input?.password);
  const phone =
    input?.phone === null || input?.phone === undefined ? null : String(input.phone).trim();
  const address =
    input?.address === null || input?.address === undefined ? null : String(input.address).trim();
  const details = [];
  if (fullName.length < 2 || fullName.length > 100)
    details.push({ field: 'full_name', issue: 'Độ dài phải từ 2 đến 100 ký tự' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    details.push({ field: 'email', issue: 'Email không hợp lệ' });
  if (details.length)
    throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu đăng ký không hợp lệ', details);
  return { fullName, email, password: pwd, phone, address };
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

function hashResetToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function mysqlDateTimeInVietnam(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function createAuthService({
  userRepository,
  sessionRepository,
  jwtSecret = process.env.JWT_SECRET,
  hashPassword = bcryptHash,
  verifyPassword = bcryptCompare,
  transactionManager = null,
  auditRepository = null,
  exposeResetToken = false,
  resetTokenGenerator = () => randomBytes(32).toString('hex'),
} = {}) {
  if (!userRepository || !sessionRepository)
    throw new TypeError('Auth service requires userRepository and sessionRepository');
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 16)
    throw new TypeError('JWT_SECRET must be configured with at least 16 characters');

  async function issueToken(user, executor = null, requestId = null) {
    const jti = randomUUID();
    const expiresAt = mysqlDateTimeInVietnam(new Date(Date.now() + SESSION_TTL_MS));
    const accessToken = jwt.sign({ userId: user.user_id, email: user.email }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
      jwtid: jti,
    });
    await sessionRepository.create({ jti, userId: user.user_id, expiresAt }, executor ?? undefined);
    if (auditRepository) {
      try {
        await auditRepository.create(
          {
            actorId: user.user_id,
            action: 'LOGIN_SUCCESS',
            entityType: 'user',
            entityId: user.user_id,
            outcome: 'SUCCESS',
            requestId,
          },
          executor ?? undefined,
        );
      } catch (error) {
        console.warn(
          JSON.stringify({
            event: 'audit_write_failed',
            action: 'LOGIN_SUCCESS',
            error: error?.code ?? 'UNKNOWN',
          }),
        );
      }
    }
    return accessToken;
  }

  async function auditFailure(userId, requestId) {
    if (!auditRepository) return;
    await safeAudit(auditRepository, {
      actorId: userId,
      action: 'LOGIN_FAILURE',
      entityType: 'user',
      entityId: userId,
      outcome: 'FAILURE',
      requestId,
    });
  }

  return {
    async register(input) {
      const { fullName, email, password: pwd, phone, address } = validateRegisterInput(input);
      const existing = await userRepository.findByEmailForAuth(email);
      if (existing) throw new AppError(409, 'CONFLICT', 'Email đã được sử dụng');
      const role = await userRepository.findRoleByName('customer');
      if (!role)
        throw new AppError(500, 'INTERNAL_ERROR', 'Hệ thống chưa cấu hình vai trò khách hàng');
      const passwordHash = await hashPassword(pwd);
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

    async login({ email, password: plainPassword } = {}, requestId = null) {
      const normalizedEmail = normalizeEmail(email);
      const suppliedPassword = String(plainPassword ?? '');
      if (!normalizedEmail || !suppliedPassword) {
        await auditFailure(null, requestId);
        throw new AppError(400, 'VALIDATION_ERROR', 'Email và mật khẩu là bắt buộc', [
          { field: 'email', issue: 'Không được để trống' },
          { field: 'password', issue: 'Không được để trống' },
        ]);
      }
      const user = await userRepository.findByEmailForAuth(normalizedEmail);
      if (!user) {
        await auditFailure(null, requestId);
        throw new AppError(401, 'UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng');
      }
      if (user.status === 'locked') {
        await auditFailure(user.user_id, requestId);
        throw new AppError(423, 'ACCOUNT_LOCKED', 'Tài khoản đang bị khóa');
      }
      if (user.status !== 'active') {
        await auditFailure(user.user_id, requestId);
        throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không còn hoạt động');
      }
      const ok = await verifyPassword(suppliedPassword, user.password_hash);
      if (!ok) {
        await auditFailure(user.user_id, requestId);
        throw new AppError(401, 'UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng');
      }

      const createLogin = async (connection) => {
        const accessToken = await issueToken(user, connection, requestId);
        return { accessToken };
      };
      const result = transactionManager
        ? await transactionManager.run(createLogin)
        : await createLogin(null);
      return {
        access_token: result.accessToken,
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
        return publicUser(await userRepository.updateUser(callerId, data));
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

    async changePassword(userId, input) {
      const currentPassword = String(input?.current_password ?? '');
      const newPassword = password(input?.new_password);
      if (!currentPassword)
        throw new AppError(400, 'VALIDATION_ERROR', 'current_password là bắt buộc');
      const user = await userRepository.findById(userId);
      if (!user || user.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không còn hợp lệ');
      if (!(await verifyPassword(currentPassword, user.password_hash)))
        throw new AppError(401, 'UNAUTHENTICATED', 'Mật khẩu hiện tại không đúng');
      if (currentPassword === newPassword)
        throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      const passwordHash = await hashPassword(newPassword);
      const work = async (connection) => {
        await userRepository.updateUser(user.user_id, { passwordHash }, connection);
        await sessionRepository.revokeAllForUser(user.user_id, connection);
      };
      if (transactionManager) await transactionManager.run(work);
      else await work(null);
      return { password_changed: true };
    },

    async requestPasswordReset(input) {
      const email = normalizeEmail(input?.email);
      const now = Date.now();
      const recent = (resetAttempts.get(email) ?? []).filter(
        (timestamp) => now - timestamp < RESET_RATE_WINDOW_MS,
      );
      if (recent.length >= RESET_RATE_MAX) {
        resetAttempts.set(email, recent);
        throw new AppError(
          429,
          'RATE_LIMITED',
          'Yêu cầu khôi phục quá nhiều, vui lòng thử lại sau',
        );
      }
      recent.push(now);
      resetAttempts.set(email, recent);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new AppError(400, 'VALIDATION_ERROR', 'Email không hợp lệ');
      const user = await userRepository.findByEmailForAuth(email);
      let token = null;
      if (user && user.status === 'active') {
        token = resetTokenGenerator();
        const tokenHash = hashResetToken(token);
        const expiresAt = mysqlDateTimeInVietnam(new Date(Date.now() + RESET_TTL_MS));
        if (transactionManager) {
          await transactionManager.run(async (connection) => {
            await userRepository.createPasswordResetToken(
              { userId: user.user_id, tokenHash, expiresAt },
              connection,
            );
          });
        } else {
          await userRepository.createPasswordResetToken({
            userId: user.user_id,
            tokenHash,
            expiresAt,
          });
        }
      }
      const result = { accepted: true };
      if (exposeResetToken && token) result.reset_token = token;
      return result;
    },

    async confirmPasswordReset(input) {
      const token = String(input?.token ?? '').trim();
      const newPassword = password(input?.new_password);
      if (token.length < 32 || token.length > 128)
        throw new AppError(400, 'VALIDATION_ERROR', 'Token khôi phục không hợp lệ');
      const tokenHash = hashResetToken(token);
      const work = async (connection) => {
        const reset = await userRepository.findActivePasswordResetToken(
          tokenHash,
          connection,
          true,
        );
        if (!reset)
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'Token khôi phục không hợp lệ hoặc đã hết hạn',
          );
        const newHash = await hashPassword(newPassword);
        await userRepository.updateUser(reset.user_id, { passwordHash: newHash }, connection);
        await userRepository.markPasswordResetUsed(reset.token_id, connection);
        await sessionRepository.revokeAllForUser(reset.user_id, connection);
      };
      if (transactionManager) await transactionManager.run(work);
      else await work(null);
      return { password_reset: true };
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
