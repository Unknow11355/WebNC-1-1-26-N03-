// Tầng truy cập dữ liệu: chỉ SQL tham số hóa, không xử lý HTTP hoặc quyền.
export function createUserRepository(db) {
  if (!db) throw new TypeError('User repository requires a database executor');

  return {
    async findByEmailForAuth(email, executor = db) {
      const [rows] = await executor.execute(
        `SELECT
           u.user_id,
           u.full_name,
           u.email,
           u.phone,
           u.password_hash,
           u.role_id,
           u.status,
           r.role_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.email = ?
         LIMIT 1`,
        [email],
      );
      return rows[0] ?? null;
    },

    async findById(userId, executor = db) {
      const [rows] = await executor.execute(
        `SELECT
           u.user_id,
           u.full_name,
           u.email,
           u.phone,
           u.address,
           u.role_id,
           u.points,
           u.membership_code,
           u.status,
           u.employment_type,
           u.created_at,
           r.role_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = ?
         LIMIT 1`,
        [userId],
      );
      return rows[0] ?? null;
    },

    async findRoleByName(roleName, executor = db) {
      const [rows] = await executor.execute(
        `SELECT role_id, role_name
         FROM roles
         WHERE role_name = ?
         LIMIT 1`,
        [roleName],
      );
      return rows[0] ?? null;
    },

    async createCustomer(
      { fullName, email, phone = null, address = null, passwordHash, roleId },
      executor = db,
    ) {
      const [result] = await executor.execute(
        `INSERT INTO users
           (full_name, email, phone, password_hash, address, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [fullName, email, phone, passwordHash, address, roleId],
      );

      return this.findById(result.insertId, executor);
    },

    async listUsers({ limit, offset }, executor = db) {
      const [rows] = await executor.execute(
        `SELECT
           u.user_id,
           u.full_name,
           u.email,
           u.phone,
           u.role_id,
           r.role_name,
           u.status,
           u.created_at
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         ORDER BY u.user_id ASC
         LIMIT ? OFFSET ?`,
        [String(limit), String(offset)],
      );
      return rows;
    },

    async countUsers(executor = db) {
      const [rows] = await executor.execute('SELECT COUNT(*) AS total FROM users');
      return Number(rows[0].total);
    },
  };
}
