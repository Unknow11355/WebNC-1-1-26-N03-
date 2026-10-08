export function createUserRepository(db) {
  if (!db) throw new TypeError('User repository requires a database executor');

  const columns = `
    u.user_id, u.full_name, u.email, u.phone, u.address, u.password_hash,
    u.role_id, u.points, u.membership_code, u.status, u.employment_type,
    u.created_at, r.role_name`;

  async function findById(userId, executor = db) {
    const [rows] = await executor.execute(
      `SELECT ${columns} FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  return {
    async findByEmailForAuth(email, executor = db) {
      const [rows] = await executor.execute(
        `SELECT ${columns} FROM users u JOIN roles r ON r.role_id = u.role_id
         WHERE u.email = ? LIMIT 1`,
        [email],
      );
      return rows[0] ?? null;
    },
    findById,
    async findRoleByName(roleName, executor = db) {
      const [rows] = await executor.execute(
        `SELECT role_id, role_name FROM roles WHERE role_name = ? LIMIT 1`,
        [roleName],
      );
      return rows[0] ?? null;
    },
    async createCustomer(
      { fullName, email, phone = null, address = null, passwordHash, roleId },
      executor = db,
    ) {
      const [result] = await executor.execute(
        `INSERT INTO users (full_name, email, phone, password_hash, address, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [fullName, email, phone, passwordHash, address, roleId],
      );
      return findById(result.insertId, executor);
    },
    async createUser(
      { fullName, email, phone = null, address = null, passwordHash, roleId, status = 'active' },
      executor = db,
    ) {
      const [result] = await executor.execute(
        `INSERT INTO users (full_name, email, phone, password_hash, address, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fullName, email, phone, passwordHash, address, roleId, status],
      );
      return findById(result.insertId, executor);
    },
    async listUsers({ limit, offset }, executor = db) {
      const [rows] = await executor.execute(
        `SELECT u.user_id, u.full_name, u.email, u.phone, u.address,
                u.role_id, r.role_name, u.status, u.employment_type, u.created_at
         FROM users u JOIN roles r ON r.role_id = u.role_id
         ORDER BY u.user_id ASC LIMIT ? OFFSET ?`,
        [String(limit), String(offset)],
      );
      return rows;
    },
    async countUsers(executor = db) {
      const [rows] = await executor.execute(`SELECT COUNT(*) AS total FROM users`);
      return Number(rows[0].total);
    },
    async updateUser(userId, data, executor = db) {
      const fields = [];
      const params = [];
      const mapping = [
        ['fullName', 'full_name'],
        ['phone', 'phone'],
        ['address', 'address'],
        ['roleId', 'role_id'],
        ['status', 'status'],
        ['passwordHash', 'password_hash'],
      ];
      for (const [key, column] of mapping) {
        if (data[key] !== undefined) {
          fields.push(`${column} = ?`);
          params.push(data[key]);
        }
      }
      if (!fields.length) return findById(userId, executor);
      params.push(userId);
      await executor.execute(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, params);
      return findById(userId, executor);
    },
    async softDelete(userId, executor = db) {
      const [result] = await executor.execute(
        `UPDATE users SET status = 'inactive' WHERE user_id = ?`,
        [userId],
      );
      return result.affectedRows;
    },
    async createPasswordResetToken({ userId, tokenHash, expiresAt }, executor = db) {
      await executor.execute("SET time_zone = '+07:00'");
      await executor.execute(
        `INSERT INTO password_reset_tokens (user_id, otp_code, token_hash, type, expired_at, used)
         VALUES (?, NULL, ?, 'password_reset', ?, 0)`,
        [userId, tokenHash, expiresAt],
      );
    },
    async findActivePasswordResetToken(tokenHash, executor = db, lock = false) {
      await executor.execute("SET time_zone = '+07:00'");
      const [rows] = await executor.execute(
        `SELECT id AS token_id, user_id, token_hash, expired_at, used
         FROM password_reset_tokens
         WHERE token_hash = ? AND type = 'password_reset' AND used = 0
           AND expired_at > CURRENT_TIMESTAMP
         ORDER BY id DESC
         LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [tokenHash],
      );
      return rows[0] ?? null;
    },
    async markPasswordResetUsed(tokenId, executor = db) {
      await executor.execute(
        `UPDATE password_reset_tokens SET used = 1 WHERE id = ? AND used = 0`,
        [tokenId],
      );
    },
  };
}
