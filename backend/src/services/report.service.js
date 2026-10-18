import { AppError } from '../errors/app-error.js';
import { getReportCache, setReportCache } from '../cache/report-cache.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = 'Asia/Ho_Chi_Minh';

export const REPORT_CACHE_STATUS = Symbol('REPORT_CACHE_STATUS');

function validateDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value))
    throw new AppError(400, 'VALIDATION_ERROR', `${field} phải có dạng YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return value;
}

function dateWindow(query = {}) {
  const from = validateDate(query.from, 'from');
  const to = validateDate(query.to, 'to');
  const fromDate = new Date(`${from}T00:00:00+07:00`);
  const toDate = new Date(`${to}T00:00:00+07:00`);
  const days = Math.round((toDate - fromDate) / 86_400_000) + 1;
  if (fromDate > toDate || days > 366)
    throw new AppError(400, 'VALIDATION_ERROR', 'Khoảng thời gian phải từ 1 đến 366 ngày');

  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const nextDayText = new Date(Date.UTC(toYear, toMonth - 1, toDay + 1)).toISOString().slice(0, 10);

  return {
    from,
    to,
    fromTimestamp: `${from} 00:00:00`,
    toTimestamp: `${nextDayText} 00:00:00`,
  };
}

function assertAdmin(auth) {
  if (auth?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Chỉ admin được xem báo cáo');
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'employee_id không hợp lệ');
  return id;
}

function pageWindow(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 20
  )
    throw new AppError(400, 'VALIDATION_ERROR', 'Phân trang không hợp lệ (tối đa 20 dòng)');
  return { page, limit, offset: (page - 1) * limit };
}

function meta(window) {
  return {
    filter: { from: window.from, to: window.to },
    timezone: TZ,
    currency: 'VND',
    generated_at: new Date().toISOString(),
  };
}

function cacheKey(auth, reportName, window) {
  return [
    auth?.role ?? 'anonymous',
    auth?.userId ?? 'anonymous',
    reportName,
    window.from,
    window.to,
  ].join('|');
}

function withCacheStatus(response, status) {
  Object.defineProperty(response, REPORT_CACHE_STATUS, {
    value: status,
    enumerable: false,
    configurable: false,
  });
  return response;
}

export function createReportService(repository) {
  if (!repository) throw new TypeError('Report service requires repository');

  return {
    async revenue(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      const result = await repository.revenue(window);
      return withCacheStatus({ data: result, meta: meta(window) }, 'BYPASS');
    },

    async products(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      const key = cacheKey(auth, 'products', window);
      const cached = getReportCache(key);
      if (cached) return withCacheStatus({ data: cached, meta: meta(window) }, 'HIT');

      const result = await repository.products(window);
      setReportCache(key, result);
      return withCacheStatus({ data: result, meta: meta(window) }, 'MISS');
    },

    async employees(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      const result = await repository.employees(window);
      return withCacheStatus({ data: result, meta: meta(window) }, 'BYPASS');
    },

    async employeeActivity(auth, rawEmployeeId, query) {
      assertAdmin(auth);
      const employeeId = positiveId(rawEmployeeId);
      const window = dateWindow(query);
      const page = pageWindow(query);
      const result = await repository.employeeActivity(employeeId, { ...window, ...page });
      if (!result.employee) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhân viên');
      return {
        data: {
          employee: result.employee,
          orders: result.orders,
          shifts: result.shifts,
          order_meta: {
            page: page.page,
            limit: page.limit,
            total: result.orderTotal,
            totalPages: Math.ceil(result.orderTotal / page.limit),
          },
          shift_meta: { total: result.shiftTotal },
        },
        meta: meta(window),
      };
    },
  };
}
