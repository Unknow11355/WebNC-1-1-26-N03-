import { AppError } from '../errors/app-error.js';

async function bcryptHash(password) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(password, 12);
}

function id(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'user_id không hợp lệ');
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

function nonEmptyString(value, field, min = 2, max = 255) {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return text;
}

function email(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
    throw new AppError(400, 'VALIDATION_ERROR', 'email không hợp lệ');
  return text;
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
    employment_type: user.employment_type,
    created_at: user.created_at,
  };
}

export function createUserService({
  repository,
  hashPassword = bcryptHash,
  transactionManager = null,
  auditRepository = null,
} = {}) {
  if (!repository) throw new TypeError('User service requires repository');

  return {
    async list(query) {
      const p = pagination(query);
      const [rows, total] = await Promise.all([
        repository.listUsers({ limit: p.limit, offset: p.offset }),
        repository.countUsers(),
      ]);
      return {
        data: rows.map(publicUser),
        meta: { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) },
      };
    },

    async getById(rawId) {
      const user = await repository.findById(id(rawId));
      if (!user) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      return publicUser(user);
    },

    async create(input) {
      const fullName = nonEmptyString(input?.full_name, 'full_name', 2, 100);
      const userEmail = email(input?.email);
      const plainPassword = String(input?.password ?? '');
      if (plainPassword.length < 8 || plainPassword.length > 72)
        throw new AppError(400, 'VALIDATION_ERROR', 'password phải từ 8 đến 72 ký tự');
      const roleName = String(input?.role_name ?? 'customer').trim();
      if (!['customer', 'employee', 'admin'].includes(roleName))
        throw new AppError(400, 'VALIDATION_ERROR', 'role_name không hợp lệ');
      if (await repository.findByEmailForAuth(userEmail))
        throw new AppError(409, 'CONFLICT', 'Email đã được sử dụng');
      const role = await repository.findRoleByName(roleName);
      if (!role) throw new AppError(500, 'INTERNAL_ERROR', 'Vai trò không tồn tại trong database');
      const status = input?.status ?? 'active';
      if (!['active', 'inactive', 'locked'].includes(status))
        throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
      const user = await repository.createUser({
        fullName,
        email: userEmail,
        phone:
          input?.phone === null || input?.phone === undefined ? null : String(input.phone).trim(),
        address:
          input?.address === null || input?.address === undefined
            ? null
            : String(input.address).trim(),
        passwordHash: await hashPassword(plainPassword),
        roleId: role.role_id,
        status,
      });
      return publicUser(user);
    },

    async update(rawId, input, auth = null) {
      const userId = id(rawId);
      const current = await repository.findById(userId);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      const data = {};
      if (input?.full_name !== undefined)
        data.fullName = nonEmptyString(input.full_name, 'full_name', 2, 100);
      if (input?.phone !== undefined)
        data.phone = input.phone === null ? null : String(input.phone).trim();
      if (input?.address !== undefined)
        data.address = input.address === null ? null : String(input.address).trim();
      let roleChanged = false;
      let statusChanged = false;
      if (input?.role_name !== undefined) {
        const roleName = String(input.role_name).trim();
        if (!['customer', 'employee', 'admin'].includes(roleName))
          throw new AppError(400, 'VALIDATION_ERROR', 'role_name không hợp lệ');
        const role = await repository.findRoleByName(roleName);
        if (!role)
          throw new AppError(400, 'VALIDATION_ERROR', 'role_name không tồn tại trong database');
        data.roleId = role.role_id;
        roleChanged = Number(current.role_id) !== Number(role.role_id);
      }
      if (input?.status !== undefined) {
        if (!['active', 'inactive', 'locked'].includes(input.status))
          throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
        data.status = input.status;
        statusChanged = current.status !== input.status;
      }
      if (input?.password !== undefined) {
        const plainPassword = String(input.password);
        if (plainPassword.length < 8 || plainPassword.length > 72)
          throw new AppError(400, 'VALIDATION_ERROR', 'password phải từ 8 đến 72 ký tự');
        data.passwordHash = await hashPassword(plainPassword);
      }

      const work = async (connection) => {
        const user = await repository.updateUser(userId, data, connection ?? undefined);
        if (auditRepository && roleChanged) {
          await auditRepository.create(
            {
              actorId: auth?.userId ?? null,
              action: 'ROLE_CHANGED',
              entityType: 'user',
              entityId: userId,
              outcome: 'SUCCESS',
              requestId: auth?.requestId ?? null,
              metadata: { from_role_id: current.role_id, to_role_id: data.roleId },
            },
            connection ?? undefined,
          );
        }
        return user;
      };

      const result =
        transactionManager && (roleChanged || statusChanged)
          ? await transactionManager.run(work)
          : await work(null);
      return publicUser(result);
    },

    async remove(rawId, auth = null) {
      const userId = id(rawId);
      const current = await repository.findById(userId);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      const work = async (connection) => {
        const affected = await repository.softDelete(userId, connection ?? undefined);
        if (affected !== 1) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
        if (auditRepository) {
          await auditRepository.create(
            {
              actorId: auth?.userId ?? null,
              action: 'DATA_DELETED',
              entityType: 'user',
              entityId: userId,
              outcome: 'SUCCESS',
              requestId: auth?.requestId ?? null,
              metadata: { soft_delete: true, previous_status: current.status },
            },
            connection ?? undefined,
          );
        }
      };
      if (transactionManager) await transactionManager.run(work);
      else await work(null);
    },
  };
}
