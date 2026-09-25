import { AppError } from '../errors/app-error.js';

function positiveInteger(value, fallback, field, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)
      || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ', [
      { field, issue: `Phải là số nguyên từ 1 đến ${max}` },
    ]);
  }
  return Number(value);
}

// Tầng nghiệp vụ: kiểm tra đầu vào và quy tắc; không SQL hoặc Express.
export function createProductService(repository) {
  return {
    async list(query) {
      const page = positiveInteger(query.page, 1, 'page', 1000000);
      const limit = positiveInteger(query.limit, 20, 'limit', 20);
      const { rows, total } = await repository.list({ limit, offset: (page - 1) * limit });
      return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },
  };
}
