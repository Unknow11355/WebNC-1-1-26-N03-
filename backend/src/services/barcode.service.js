import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
export function createBarcodeService(
  repository,
  generate = () => randomBytes(8).toString('hex').toUpperCase(),
) {
  function code(value) {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 50 ||
      Array.from(value).some((c) => c.codePointAt(0) < 32 || c.codePointAt(0) === 127)
    )
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã dài 1–50 ký tự, không chứa ký tự điều khiển');
    return value.trim();
  }
  async function check(raw) {
    const value = code(raw);
    const [product, inventory] = await Promise.all([
      repository.product(value, false),
      repository.inventory(value, false),
    ]);
    return {
      exists: Boolean(product || inventory),
      product_exists: Boolean(product),
      inventory_exists: Boolean(inventory),
    };
  }
  return {
    check,
    async scan(raw) {
      const value = code(raw);
      const product = await repository.product(value);
      if (product) return { type: 'product', product };
      const inventoryItem = await repository.inventory(value);
      if (inventoryItem) return { type: 'inventory_item', inventory_item: inventoryItem };
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy hàng đang hoạt động theo mã này');
    },
    async generate(input = {}) {
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        (input.prefix !== undefined && typeof input.prefix !== 'string')
      )
        throw new AppError(400, 'VALIDATION_ERROR', 'prefix phải là chuỗi');
      const prefix =
        (input.prefix ?? 'SP')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 8) || 'SP';
      for (let i = 0; i < 20; i++) {
        const value = prefix + generate();
        if (!(await check(value)).exists) return { code: value, reserved: false };
      }
      throw new AppError(409, 'CONFLICT', 'Không tạo được mã chưa sử dụng');
    },
  };
}
