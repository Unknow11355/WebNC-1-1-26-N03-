const columns = `shift_id, employee_id, DATE_FORMAT(shift_date,'%Y-%m-%d') AS shift_date,
 start_time, end_time, status, note, DATE_FORMAT(ended_at,'%Y-%m-%d %H:%i:%s') AS ended_at`;
export function createShiftRepository(db) {
  return {
    async employee(id, cx = db, lock = false) {
      const [rows] = await cx.execute(
        `SELECT u.user_id,u.status,r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=?${lock ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return rows[0];
    },
    async current(id, cx = db) {
      const [rows] = await cx.execute(
        `SELECT ${columns} FROM work_shifts WHERE employee_id=? AND end_time IS NULL AND status IN ('active','working','open') ORDER BY shift_id DESC LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },
    async clock(cx) {
      const [rows] = await cx.execute(
        "SELECT DATE_FORMAT(UTC_TIMESTAMP() + INTERVAL 7 HOUR,'%Y-%m-%d %H:%i:%s') AS now",
      );
      return rows[0].now;
    },
    async blocked(id, date, cx) {
      const [rows] = await cx.execute(
        'SELECT day_status FROM employee_day_overrides WHERE employee_id=? AND work_date=? FOR UPDATE',
        [id, date],
      );
      return ['leave', 'sick', 'blocked'].includes(rows[0]?.day_status);
    },
    async start(id, now, cx) {
      const [result] = await cx.execute(
        "INSERT INTO work_shifts(employee_id,shift_date,start_time,status) VALUES (?,?,?,'active')",
        [id, now.slice(0, 10), now.slice(11)],
      );
      return result.insertId;
    },
    async end(shiftId, now, cx) {
      await cx.execute(
        "UPDATE work_shifts SET end_time=?,ended_at=?,status='completed' WHERE shift_id=?",
        [now.slice(11), now, shiftId],
      );
    },
    async get(shiftId, cx) {
      const [rows] = await cx.execute(`SELECT ${columns} FROM work_shifts WHERE shift_id=?`, [
        shiftId,
      ]);
      return rows[0];
    },
    async history(id, range) {
      const [rows] = await db.execute(
        `SELECT ${columns} FROM work_shifts WHERE employee_id=? AND shift_date>=? AND shift_date<? ORDER BY shift_date DESC,start_time DESC,shift_id DESC LIMIT ? OFFSET ?`,
        [id, range.start, range.end, String(range.limit), String((range.page - 1) * range.limit)],
      );
      const [[count]] = await db.execute(
        'SELECT COUNT(*) AS total FROM work_shifts WHERE employee_id=? AND shift_date>=? AND shift_date<?',
        [id, range.start, range.end],
      );
      return { items: rows, page: range.page, limit: range.limit, total: Number(count.total) };
    },
  };
}
