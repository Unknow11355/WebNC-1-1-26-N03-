import { AppError } from '../errors/app-error.js';
import { monthRange } from './schedule.service.js';
const fail = (status, message) => {
  throw new AppError(
    status,
    status === 403 ? 'FORBIDDEN' : status === 400 ? 'VALIDATION_ERROR' : 'CONFLICT',
    message,
  );
};
export function createShiftService({ repository: r, transactionManager: tx }) {
  function target(auth, value) {
    if (!['admin', 'employee'].includes(auth?.role)) fail(403, 'Không có quyền truy cập ca làm');
    const id = Number(value);
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(id))
      fail(400, 'Mã nhân viên không hợp lệ');
    if (auth.role !== 'admin' && id !== Number(auth.userId))
      fail(403, 'Chỉ được thao tác ca của mình');
    return id;
  }
  async function person(id, cx, lock = false) {
    const p = await r.employee(id, cx, lock);
    if (!p || p.role_name !== 'employee')
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhân viên');
    return p;
  }
  return {
    async current(auth, value) {
      const id = target(auth, value);
      await person(id);
      return r.current(id);
    },
    async history(auth, value, query) {
      const id = target(auth, value);
      await person(id);
      const range = monthRange(query),
        page = Number(query.page ?? 1),
        limit = Number(query.limit ?? 20);
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 100000 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 20
      )
        fail(400, 'Phân trang không hợp lệ (tối đa 20 dòng)');
      return r.history(id, { ...range, page, limit });
    },
    async change(auth, value, action, input = {}) {
      const id = target(auth, value);
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        Object.keys(input).some((k) => k !== 'shift_id')
      )
        fail(400, 'Không được truyền nhân viên, trạng thái hoặc thời gian trong body');
      if (!['start', 'end'].includes(action)) fail(400, 'Thao tác không hợp lệ');
      if (action === 'start' && Object.keys(input).length)
        fail(400, 'Mở ca không nhận dữ liệu body');
      if (action === 'end' && (!Number.isSafeInteger(input.shift_id) || input.shift_id < 1))
        fail(400, 'Cần shift_id của ca muốn kết thúc');
      return tx.run(async (cx) => {
        const p = await person(id, cx, true); // Shared employee lock serializes start/end/POS.
        if (action === 'start' && p.status !== 'active') fail(409, 'Nhân viên đã ngừng hoạt động');
        const current = await r.current(id, cx),
          now = await r.clock(cx);
        let shiftId;
        if (action === 'start') {
          if (current) fail(409, 'Nhân viên đang có ca mở');
          if (await r.blocked(id, now.slice(0, 10), cx))
            fail(409, 'Ngày nghỉ hoặc bị chặn không được mở ca');
          shiftId = await r.start(id, now, cx);
        } else {
          if (!current || current.shift_id !== input.shift_id)
            fail(409, 'Ca đã đóng hoặc không phải ca đang mở; hãy tải lại');
          if (`${current.shift_date} ${current.start_time}` > now)
            fail(409, 'Thời gian kết thúc trước thời gian bắt đầu');
          shiftId = current.shift_id;
          await r.end(shiftId, now, cx);
        }
        return r.get(shiftId, cx);
      });
    },
  };
}
