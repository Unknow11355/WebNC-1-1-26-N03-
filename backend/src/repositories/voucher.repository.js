import { AppError } from '../errors/app-error.js';

export function createVoucherRepository(db) {
  if (!db) throw new TypeError('Voucher repository requires a database executor');
  async function findById(voucherId, executor = db, lock = false) {
    const [rows] = await executor.execute(
      `SELECT voucher_id, code, description, discount_type, discount_value,
              min_order_amount, max_discount, usage_limit, used_count,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date, status
       FROM vouchers WHERE voucher_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [voucherId],
    );
    return rows[0] ?? null;
  }
  return {
    findById,
    async findByCode(code, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT voucher_id, code, description, discount_type, discount_value,
                min_order_amount, max_discount, usage_limit, used_count,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date, status
         FROM vouchers WHERE code = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [code],
      );
      return rows[0] ?? null;
    },
    async list(executor = db) {
      const [rows] = await executor.execute(
        `SELECT voucher_id, code, description, discount_type, discount_value,
                min_order_amount, max_discount, usage_limit, used_count,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date, status
         FROM vouchers ORDER BY voucher_id ASC`,
      );
      return rows;
    },
    async listAvailableForCustomer(userId, today, executor = db) {
      const [rows] = await executor.execute(
        `SELECT v.voucher_id, v.code, v.description, v.discount_type, v.discount_value,
                v.min_order_amount, v.max_discount, v.usage_limit, v.used_count,
                DATE_FORMAT(v.expiry_date, '%Y-%m-%d') AS expiry_date, v.status
         FROM vouchers v
         WHERE v.status = 'active'
           AND (v.expiry_date IS NULL OR v.expiry_date >= ?)
           AND (v.usage_limit IS NULL OR v.used_count < v.usage_limit)
           AND NOT EXISTS (
             SELECT 1 FROM user_vouchers uv
             WHERE uv.user_id = ? AND uv.voucher_id = v.voucher_id
           )
         ORDER BY v.expiry_date IS NULL, v.expiry_date ASC, v.voucher_id ASC`,
        [today, userId],
      );
      return rows;
    },
    async listForCustomer(userId, today, executor = db) {
      const [rows] = await executor.execute(
        `SELECT v.voucher_id, v.code, v.description, v.discount_type, v.discount_value,
                v.min_order_amount, v.max_discount, v.usage_limit, v.used_count,
                DATE_FORMAT(v.expiry_date, '%Y-%m-%d') AS expiry_date, v.status,
                uv.used_count AS customer_used_count,
                uv.last_used_at,
                CASE WHEN v.status <> 'active'
                          OR (v.expiry_date IS NOT NULL AND v.expiry_date < ?)
                          OR (v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit)
                     THEN 0 ELSE 1 END AS usable
         FROM user_vouchers uv
         JOIN vouchers v ON v.voucher_id = uv.voucher_id
         WHERE uv.user_id = ?
         ORDER BY uv.created_at DESC, uv.user_voucher_id DESC`,
        [today, userId],
      );
      return rows;
    },
    async findCustomerVoucher(userId, voucherId, executor = db, lock = false) {
      const [rows] = await executor.execute(
        `SELECT user_voucher_id, user_id, voucher_id, used_count, last_used_at, created_at
         FROM user_vouchers WHERE user_id = ? AND voucher_id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [userId, voucherId],
      );
      return rows[0] ?? null;
    },
    async claimForCustomer(userId, voucherId, executor = db) {
      await executor.execute(
        `INSERT IGNORE INTO user_vouchers (user_id, voucher_id) VALUES (?, ?)`,
        [userId, voucherId],
      );
    },
    async incrementCustomerUsed(userId, voucherId, executor = db) {
      const [result] = await executor.execute(
        `UPDATE user_vouchers
         SET used_count = used_count + 1, last_used_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND voucher_id = ?`,
        [userId, voucherId],
      );
      if (result.affectedRows !== 1)
        throw new AppError(403, 'FORBIDDEN', 'Khách hàng chưa lưu voucher này');
    },
    async decrementCustomerUsed(userId, voucherId, executor = db) {
      await executor.execute(
        `UPDATE user_vouchers SET used_count = GREATEST(used_count - 1, 0)
         WHERE user_id = ? AND voucher_id = ? AND used_count > 0`,
        [userId, voucherId],
      );
    },
    async create(data, executor = db) {
      const [result] = await executor.execute(
        `INSERT INTO vouchers
          (code, description, discount_type, discount_value, min_order_amount,
           max_discount, usage_limit, used_count, expiry_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          data.code,
          data.description,
          data.discountType,
          data.discountValue,
          data.minOrderAmount,
          data.maxDiscount,
          data.usageLimit,
          data.expiryDate,
          data.status,
        ],
      );
      return findById(result.insertId, executor);
    },
    async update(voucherId, data, executor = db) {
      await executor.execute(
        `UPDATE vouchers SET description = ?, discount_type = ?, discount_value = ?,
           min_order_amount = ?, max_discount = ?, usage_limit = ?, expiry_date = ?, status = ?
         WHERE voucher_id = ?`,
        [
          data.description,
          data.discountType,
          data.discountValue,
          data.minOrderAmount,
          data.maxDiscount,
          data.usageLimit,
          data.expiryDate,
          data.status,
          voucherId,
        ],
      );
      return findById(voucherId, executor);
    },
    async setInactive(voucherId, executor = db) {
      await executor.execute(`UPDATE vouchers SET status = 'inactive' WHERE voucher_id = ?`, [
        voucherId,
      ]);
    },
    async incrementUsed(voucherId, executor = db) {
      const [result] = await executor.execute(
        `UPDATE vouchers SET used_count = used_count + 1
         WHERE voucher_id = ? AND status = 'active'
           AND (usage_limit IS NULL OR used_count < usage_limit)`,
        [voucherId],
      );
      if (result.affectedRows !== 1)
        throw new AppError(409, 'CONFLICT', 'Voucher đã hết lượt sử dụng');
    },
    async decrementUsed(voucherId, executor = db) {
      await executor.execute(
        `UPDATE vouchers SET used_count = GREATEST(used_count - 1, 0) WHERE voucher_id = ?`,
        [voucherId],
      );
    },
  };
}
