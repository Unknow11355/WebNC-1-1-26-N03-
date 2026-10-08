import { AppError } from '../errors/app-error.js';

const ACTIONS = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ROLE_CHANGED', 'DATA_DELETED'];
const OUTCOMES = ['SUCCESS', 'FAILURE'];

function positiveInt(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function pagination(query = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
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

function date(value, field) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new AppError(400, 'VALIDATION_ERROR', `${field} phải có dạng YYYY-MM-DD`);
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return value;
}

function window(query) {
  const from = date(query.from, 'from');
  const to = date(query.to, 'to');
  if (!from && !to) return { from: null, to: null };
  if (!from || !to) throw new AppError(400, 'VALIDATION_ERROR', 'from và to phải đi cùng nhau');
  const fromDate = new Date(`${from}T00:00:00+07:00`);
  const toDate = new Date(`${to}T00:00:00+07:00`);
  const days = Math.round((toDate - fromDate) / 86_400_000) + 1;
  if (fromDate > toDate || days > 366)
    throw new AppError(400, 'VALIDATION_ERROR', 'Khoảng thời gian phải từ 1 đến 366 ngày');

  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const nextDayText = new Date(Date.UTC(toYear, toMonth - 1, toDay + 1)).toISOString().slice(0, 10);
  return {
    from: `${from} 00:00:00`,
    to: `${nextDayText} 00:00:00`,
  };
}

export function createAuditService({ repository } = {}) {
  if (!repository) throw new TypeError('Audit service requires repository');
  return {
    async list(auth, query = {}) {
      if (auth?.role !== 'admin')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ admin được tra cứu audit');
      const p = pagination(query);
      const actorId =
        query.actor_id === undefined || query.actor_id === ''
          ? null
          : positiveInt(query.actor_id, 'actor_id');
      const action =
        query.action === undefined || query.action === '' ? null : String(query.action).trim();
      const outcome =
        query.outcome === undefined || query.outcome === '' ? null : String(query.outcome).trim();
      if (action !== null && !ACTIONS.includes(action))
        throw new AppError(400, 'VALIDATION_ERROR', 'action không hợp lệ');
      if (outcome !== null && !OUTCOMES.includes(outcome))
        throw new AppError(400, 'VALIDATION_ERROR', 'outcome không hợp lệ');
      const result = await repository.list({
        actorId,
        action,
        outcome,
        ...window(query),
        limit: p.limit,
        offset: p.offset,
      });
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
  };
}

export async function safeAudit(repository, payload) {
  try {
    await repository.create(payload);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'audit_write_failed',
        action: payload?.action,
        error: error?.code ?? 'UNKNOWN',
      }),
    );
  }
}
