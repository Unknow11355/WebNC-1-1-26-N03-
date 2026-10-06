export function createScheduleRepository(db) {
  return {
    async employee(id) {
      const [rows] = await db.execute(
        "SELECT u.user_id, u.full_name, u.employment_type, u.status FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=? AND r.role_name='employee'",
        [id],
      );
      return rows[0] ?? null;
    },
    async overview(start, end) {
      const [rows] = await db.execute(
        "SELECT u.user_id, u.full_name, u.employment_type, COUNT(o.override_id) AS blocked_days FROM users u JOIN roles r ON r.role_id=u.role_id LEFT JOIN employee_day_overrides o ON o.employee_id=u.user_id AND o.work_date>=? AND o.work_date<? AND o.day_status IN ('leave','sick','blocked') WHERE r.role_name='employee' AND u.status='active' GROUP BY u.user_id,u.full_name,u.employment_type ORDER BY u.full_name,u.user_id",
        [start, end],
      );
      return rows;
    },
    async days(id, start, end) {
      const [overrides] = await db.execute(
        "SELECT DATE_FORMAT(work_date,'%Y-%m-%d') AS work_date, day_status, note FROM employee_day_overrides WHERE employee_id=? AND work_date>=? AND work_date<?",
        [id, start, end],
      );
      const [shifts] = await db.execute(
        "SELECT shift_id, DATE_FORMAT(shift_date,'%Y-%m-%d') AS shift_date, start_time, end_time, status FROM work_shifts WHERE employee_id=? AND shift_date>=? AND shift_date<? ORDER BY shift_date,start_time,shift_id",
        [id, start, end],
      );
      return { overrides, shifts };
    },
    async setDay(id, date, status, note, actorId) {
      if (status === 'clear') {
        await db.execute('DELETE FROM employee_day_overrides WHERE employee_id=? AND work_date=?', [
          id,
          date,
        ]);
      } else {
        await db.execute(
          'INSERT INTO employee_day_overrides(employee_id,work_date,day_status,note,set_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE day_status=VALUES(day_status),note=VALUES(note),set_by=VALUES(set_by)',
          [id, date, status, note, actorId],
        );
      }
    },
  };
}
