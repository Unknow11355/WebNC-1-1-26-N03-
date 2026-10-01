import { AppError } from '../errors/app-error.js';

export function createVoucherRepository(db) {
  if (!db) throw new TypeError('Voucher repository requires a database executor');
  async function findById(voucherId, executor = db, lock = false) {
    const [rows] = await executor.execute(
      `SELECT voucher_id, code, description, discount_type, discount_value,
              min_order_amount, max_discount, usage_limit, used_count, expiry_date, status
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
                min_order_amount, max_discount, usage_limit, used_count, expiry_date, status
         FROM vouchers WHERE code = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
        [code],
      );
      return rows[0] ?? null;
    },
    async list(executor = db) {
      const [rows] = await executor.execute(
        `SELECT voucher_id, code, description, discount_type, discount_value,
                min_order_amount, max_discount, usage_limit, used_count, expiry_date, status
         FROM vouchers ORDER BY voucher_id ASC`,
      );
      return rows;
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
