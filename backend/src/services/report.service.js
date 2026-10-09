import { AppError } from '../errors/app-error.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = 'Asia/Ho_Chi_Minh';

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

  // SQL repositories query with a MySQL session timezone of +07:00, so pass
  // Asia/Ho_Chi_Minh wall-clock timestamps, not UTC-formatted strings.
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

function meta(window) {
  return {
    filter: { from: window.from, to: window.to },
    timezone: TZ,
    currency: 'VND',
    generated_at: new Date().toISOString(),
  };
}

export function createReportService(repository) {
  if (!repository) throw new TypeError('Report service requires repository');
  return {
    async revenue(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      const result = await repository.revenue(window);
      return { data: result, meta: meta(window) };
    },
    async products(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      return { data: await repository.products(window), meta: meta(window) };
    },
    async employees(auth, query) {
      assertAdmin(auth);
      const window = dateWindow(query);
      return { data: await repository.employees(window), meta: meta(window) };
    },
  };
}
