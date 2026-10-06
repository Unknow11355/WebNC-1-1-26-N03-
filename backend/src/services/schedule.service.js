import { AppError } from '../errors/app-error.js';
const blocked = ['leave', 'sick', 'blocked'];
function bad(message) {
  return new AppError(400, 'VALIDATION_ERROR', message);
}
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw bad('Mã nhân viên không hợp lệ');
  return Number(value);
}
export function monthRange(query) {
  const year = Number(query.year),
    month = Number(query.month);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw bad('Năm 2000–2100 và tháng 1–12 là bắt buộc');
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;
  return { year, month, count, start, end };
}
export function createScheduleService(repository) {
  async function employee(auth, rawId, write = false) {
    const employeeId = id(rawId);
    if (
      auth?.role !== 'admin' &&
      (write || auth?.role !== 'employee' || Number(auth.userId) !== employeeId)
    )
      throw new AppError(403, 'FORBIDDEN', 'Không có quyền truy cập lịch nhân viên này');
    const person = await repository.employee(employeeId);
    if (!person || person.status !== 'active')
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhân viên đang hoạt động');
    return person;
  }
  return {
    async overview(auth, query) {
      if (auth?.role !== 'admin')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ admin xem tổng quan lịch');
      const range = monthRange(query);
      return {
        year: range.year,
        month: range.month,
        employees: await repository.overview(range.start, range.end),
      };
    },
    async month(auth, rawId, query) {
      const person = await employee(auth, rawId);
      const range = monthRange(query);
      const { overrides, shifts } = await repository.days(person.user_id, range.start, range.end);
      const byDate = new Map(overrides.map((o) => [o.work_date, o]));
      const days = Array.from({ length: range.count }, (_, i) => {
        const date = range.start.slice(0, 8) + String(i + 1).padStart(2, '0');
        const override = byDate.get(date);
        return {
          work_date: date,
          default_status: person.employment_type === 'part_time' ? 'flexible' : 'scheduled',
          override_status: override?.day_status ?? null,
          note: override?.note ?? null,
          schedule_allows_work: !blocked.includes(override?.day_status),
          shifts: shifts.filter((s) => s.shift_date === date),
        };
      });
      return {
        employee: person,
        year: range.year,
        month: range.month,
        days,
        summary: {
          total_days: days.length,
          blocked_days: days.filter((d) => !d.schedule_allows_work).length,
          worked_days: new Set(shifts.map((s) => s.shift_date)).size,
        },
      };
    },
    async setDay(auth, rawId, input) {
      const person = await employee(auth, rawId, true);
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        Object.keys(input).some((k) => !['work_date', 'day_status', 'note'].includes(k))
      )
        throw bad('Dữ liệu lịch không hợp lệ');
      const date = input.work_date;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw bad('Ngày phải theo YYYY-MM-DD');
      const range = monthRange({ year: date.slice(0, 4), month: date.slice(5, 7) });
      const day = Number(date.slice(8));
      if (day < 1 || day > range.count) throw bad('Ngày không tồn tại');
      const status = input.day_status === 'scheduled' ? 'clear' : input.day_status;
      if (![...blocked, 'clear'].includes(status))
        throw bad('Trạng thái: leave, sick, blocked hoặc clear');
      if (input.note !== undefined && input.note !== null && typeof input.note !== 'string')
        throw bad('Ghi chú phải là chuỗi');
      const note = input.note?.trim() || null;
      if (note && note.length > 255) throw bad('Ghi chú tối đa 255 ký tự');
      await repository.setDay(person.user_id, date, status, note, id(auth.userId));
      return { employee_id: person.user_id, work_date: date, day_status: status, note };
    },
  };
}
