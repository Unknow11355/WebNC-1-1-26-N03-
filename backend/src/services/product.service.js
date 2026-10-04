import { AppError } from '../errors/app-error.js';

function positiveInteger(value, fallback, field, max) {
  if (value === undefined) return fallback;
  if (
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > max
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', [
      { field, issue: `Phải là số nguyên từ 1 đến ${max}` },
    ]);
  }
  return Number(value);
}

function positiveNumber(value, field, allowZero = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  }
  return number;
}

function normalizeInput(input, current = null) {
  const productName = String(input?.product_name ?? current?.product_name ?? '').trim();
  const barcode = String(input?.barcode ?? current?.barcode ?? '').trim();
  const unit = String(input?.unit ?? current?.unit ?? '').trim();
  if (!productName || !barcode || !unit)
    throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu thông tin sản phẩm');
  const price = positiveNumber(input?.price ?? current?.price, 'price');
  const categoryId = positiveInteger(
    input?.category_id ?? current?.category_id,
    null,
    'category_id',
    Number.MAX_SAFE_INTEGER,
  );
  const minStock = positiveNumber(input?.min_stock ?? current?.min_stock ?? 10, 'min_stock', true);
  if (!Number.isInteger(minStock))
    throw new AppError(400, 'VALIDATION_ERROR', 'min_stock phải là số nguyên');
  return {
    productName,
    stock: 0,
    barcode,
    unit,
    price,
    categoryId,
    minStock,
    description: input?.description ?? current?.description ?? null,
    imageUrl: input?.image_url ?? current?.image_url ?? null,
  };
}

export function createProductService(repository) {
  if (!repository) throw new TypeError('Product service requires repository');

  return {
    async list(query) {
      const page = positiveInteger(query.page, 1, 'page', 1000000);
      const limit = positiveInteger(query.limit, 20, 'limit', 20);
      const categoryId =
        query.category_id === null || query.category_id === undefined
          ? null
          : positiveInteger(query.category_id, null, 'category_id', Number.MAX_SAFE_INTEGER);
      const result = await repository.list({
        limit,
        offset: (page - 1) * limit,
        q: query.q ? String(query.q).trim() : null,
        categoryId,
      });
      return {
        data: result.rows,
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
      };
    },
    async getById(rawId) {
      const productId = positiveInteger(rawId, null, 'product_id', Number.MAX_SAFE_INTEGER);
      const product = await repository.findById(productId);
      if (!product || product.status !== 'active')
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
      return product;
    },
    async create(input) {
      return repository.create(normalizeInput(input));
    },
    async update(rawId, input) {
      const productId = positiveInteger(rawId, null, 'product_id', Number.MAX_SAFE_INTEGER);
      const current = await repository.findById(productId);
      if (!current || current.status !== 'active')
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
      return repository.update(productId, normalizeInput(input, current));
    },
    async softDelete(rawId) {
      const productId = positiveInteger(rawId, null, 'product_id', Number.MAX_SAFE_INTEGER);
      if (!(await repository.findById(productId)))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
      await repository.softDelete(productId);
    },
  };
}
