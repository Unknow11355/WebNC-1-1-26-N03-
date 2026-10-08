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

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return number;
}

function positiveNumber(value, field, allowZero = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0))
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return number;
}

function booleanQuery(value, field) {
  if (value === undefined) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError(400, 'VALIDATION_ERROR', `${field} chỉ nhận true hoặc false`);
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

export function createProductService(input) {
  const repository = input?.repository ?? input;
  const transactionManager = input?.repository ? (input.transactionManager ?? null) : null;
  const auditRepository = input?.repository ? (input.auditRepository ?? null) : null;
  if (!repository) throw new TypeError('Product service requires repository');
  return {
    async list(query = {}) {
      const page = positiveInteger(query.page, 1, 'page', 1_000_000);
      const limit = positiveInteger(query.limit, 20, 'limit', 20);
      const q = query.q === undefined ? null : String(query.q).trim();
      if (q !== null && q.length > 100)
        throw new AppError(400, 'VALIDATION_ERROR', 'q tối đa 100 ký tự');
      const categoryId =
        query.category_id === undefined || query.category_id === ''
          ? null
          : positiveInteger(query.category_id, null, 'category_id', Number.MAX_SAFE_INTEGER);
      const minPrice =
        query.min_price === undefined || query.min_price === ''
          ? null
          : nonNegativeNumber(query.min_price, 'min_price');
      const maxPrice =
        query.max_price === undefined || query.max_price === ''
          ? null
          : nonNegativeNumber(query.max_price, 'max_price');
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice)
        throw new AppError(400, 'VALIDATION_ERROR', 'min_price không được lớn hơn max_price');
      const inStock = booleanQuery(query.in_stock, 'in_stock');
      const sort = String(query.sort ?? 'product_id');
      const order = String(query.order ?? 'asc').toLowerCase();
      if (!['product_id', 'product_name', 'price', 'stock'].includes(sort))
        throw new AppError(400, 'VALIDATION_ERROR', 'sort không hợp lệ');
      if (!['asc', 'desc'].includes(order))
        throw new AppError(400, 'VALIDATION_ERROR', 'order không hợp lệ');

      const result = await repository.list({
        limit,
        offset: (page - 1) * limit,
        q: q || null,
        categoryId,
        minPrice,
        maxPrice,
        inStock,
        sort,
        order,
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
    async softDelete(rawId, auth = null) {
      const productId = positiveInteger(rawId, null, 'product_id', Number.MAX_SAFE_INTEGER);
      const work = async (connection) => {
        const current = await repository.findById(productId, connection ?? undefined);
        if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
        const affected = await repository.softDelete(productId, connection ?? undefined);
        if (affected !== 1) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
        if (auditRepository) {
          await auditRepository.create(
            {
              actorId: auth?.userId ?? null,
              action: 'DATA_DELETED',
              entityType: 'product',
              entityId: productId,
              outcome: 'SUCCESS',
              requestId: auth?.requestId ?? null,
              metadata: { soft_delete: true, previous_status: current.status },
            },
            connection ?? undefined,
          );
        }
      };
      if (transactionManager) await transactionManager.run(work);
      else await work(null);
    },
  };
}
