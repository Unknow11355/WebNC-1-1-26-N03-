import { AppError } from '../errors/app-error.js';

function id(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return parsed;
}

function positive(value, field, allowZero = false, integer = false) {
  const parsed = Number(value);
  if (
    !['number', 'string'].includes(typeof value) ||
    (typeof value === 'string' && value.trim() === '') ||
    !Number.isFinite(parsed) ||
    (allowZero ? parsed < 0 : parsed <= 0) ||
    (integer && !Number.isSafeInteger(parsed))
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  }
  return parsed;
}

function pagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isInteger(page) ||
    page <= 0 ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > 20
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
  }
  return { page, limit, offset: (page - 1) * limit };
}

function employeeId(auth) {
  return id(auth?.userId, 'user_id');
}

function normalizeItem(input, current = {}) {
  const barcode = String(input?.barcode ?? current.barcode ?? '').trim();
  const itemName = String(input?.item_name ?? current.item_name ?? '').trim();
  const unit = String(input?.unit ?? current.unit ?? '').trim();
  if (!barcode || !itemName || !unit)
    throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu thông tin mặt hàng kho');
  const categoryId = input?.category_id ?? current.category_id ?? null;
  const price = positive(input?.price ?? current.price, 'price');
  const importPrice = input?.import_price ?? current.import_price ?? null;
  if (importPrice !== null && positive(importPrice, 'import_price') > price) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Giá bán không được nhỏ hơn giá nhập');
  }
  return {
    barcode,
    itemName,
    unit,
    categoryId:
      categoryId === null || categoryId === undefined ? null : id(categoryId, 'category_id'),
    price,
    importPrice:
      importPrice === null || importPrice === undefined
        ? null
        : positive(importPrice, 'import_price'),
    imageUrl: input?.image_url ?? current.image_url ?? null,
    status: String(input?.status ?? current.status ?? 'available'),
  };
}

export function createInventoryService({
  repository,
  productRepository,
  transactionManager,
  auditRepository = null,
}) {
  if (!repository || !productRepository || !transactionManager) {
    throw new TypeError('Inventory service requires repositories and transaction manager');
  }

  return {
    async list(query) {
      const p = pagination(query);
      const status =
        query.status === null || query.status === undefined || query.status === ''
          ? null
          : String(query.status);
      if (status !== null && !['active', 'available', 'inactive'].includes(status))
        throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
      const result = await repository.list({ ...p, status });
      return {
        data: result.rows,
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },
    async getById(rawId) {
      const item = await repository.findById(id(rawId, 'inventory_item_id'));
      if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
      return item;
    },
    async create(input) {
      const data = normalizeItem(input);
      if (!['active', 'available', 'inactive'].includes(data.status))
        throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
      return repository.create(data);
    },
    async update(rawId, input) {
      const inventoryId = id(rawId, 'inventory_item_id');
      const current = await repository.findById(inventoryId);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
      const data = normalizeItem(input, current);
      if (!['active', 'available', 'inactive'].includes(data.status))
        throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
      return repository.update(inventoryId, data);
    },
    async remove(rawId, auth = null) {
      const inventoryId = id(rawId, 'inventory_item_id');
      const work = async (connection) => {
        const current = await repository.findById(inventoryId, connection ?? undefined);
        if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
        const affected = await repository.softDelete(inventoryId, connection ?? undefined);
        if (affected !== 1) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
        if (auditRepository) {
          await auditRepository.create(
            {
              actorId: auth?.userId ?? null,
              action: 'DATA_DELETED',
              entityType: 'inventory_item',
              entityId: inventoryId,
              outcome: 'SUCCESS',
              requestId: auth?.requestId ?? null,
              metadata: { soft_delete: true, previous_status: current.status },
            },
            connection ?? undefined,
          );
        }
      };
      await transactionManager.run(work);
    },
    async listLogs(query) {
      const p = pagination(query);
      const inventoryItemId =
        query.inventory_item_id === null ||
        query.inventory_item_id === undefined ||
        query.inventory_item_id === ''
          ? null
          : id(query.inventory_item_id, 'inventory_item_id');
      const result = await repository.listLogs({ ...p, inventoryItemId });
      return {
        data: result.rows,
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },

    async importStock(auth, input) {
      const operatorId = employeeId(auth);
      const inventoryId = id(input?.inventory_item_id, 'inventory_item_id');
      const quantity = positive(input?.quantity, 'quantity', false, true);
      const importPrice = positive(input?.import_price, 'import_price');
      const note = String(input?.note ?? '').trim();
      if (!note) throw new AppError(400, 'VALIDATION_ERROR', 'Lý do nhập kho là bắt buộc');

      return transactionManager.run(async (connection) => {
        const item = await repository.findByIdForUpdate(inventoryId, connection);
        if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
        if (!['active', 'available'].includes(String(item.status)))
          throw new AppError(409, 'CONFLICT', 'Mặt hàng kho đã ngừng hoạt động');
        if (importPrice > item.price)
          throw new AppError(400, 'VALIDATION_ERROR', 'Giá bán không được nhỏ hơn giá nhập');
        await repository.increaseStock(inventoryId, quantity, importPrice, connection);
        await repository.addLog(
          {
            inventoryItemId: inventoryId,
            productId: null,
            employeeId: operatorId,
            action: 'import',
            quantity,
            importPrice,
            note,
          },
          connection,
        );
        return repository.findById(inventoryId, connection);
      });
    },

    async exportToShelf(auth, input) {
      const operatorId = employeeId(auth);
      const inventoryId = id(input?.inventory_item_id, 'inventory_item_id');
      const quantity = positive(input?.quantity, 'quantity', false, true);
      const note = String(input?.note ?? '').trim();
      if (!note) throw new AppError(400, 'VALIDATION_ERROR', 'Lý do xuất kho là bắt buộc');

      return transactionManager.run(async (connection) => {
        const item = await repository.findByIdForUpdate(inventoryId, connection);
        if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
        if (!['active', 'available'].includes(String(item.status)))
          throw new AppError(409, 'CONFLICT', 'Mặt hàng kho đã ngừng hoạt động');
        if (Number(item.stock) < quantity)
          throw new AppError(409, 'INSUFFICIENT_STOCK', 'Không đủ tồn kho để đưa hàng lên kệ');

        let product = await productRepository.findByBarcodeForUpdate(item.barcode, connection);
        if (product && product.status !== 'active') {
          throw new AppError(409, 'CONFLICT', 'Sản phẩm cùng mã vạch đã ngừng bán');
        }
        if (!product) {
          if (!item.category_id)
            throw new AppError(
              422,
              'BUSINESS_RULE_VIOLATION',
              'Mặt hàng chưa có category_id để tạo sản phẩm',
            );
          product = await productRepository.create(
            {
              productName: item.item_name,
              barcode: item.barcode,
              description: null,
              imageUrl: item.image_url,
              price: item.price,
              unit: item.unit,
              stock: 0,
              minStock: 10,
              categoryId: item.category_id,
            },
            connection,
          );
        }

        await repository.decreaseStock(inventoryId, quantity, connection);
        await productRepository.increaseStock(product.product_id, quantity, connection);
        await repository.addLog(
          {
            inventoryItemId: inventoryId,
            productId: product.product_id,
            employeeId: operatorId,
            action: 'export',
            quantity: -quantity,
            importPrice: item.import_price,
            note,
          },
          connection,
        );

        return {
          inventory_item_id: inventoryId,
          product_id: product.product_id,
          transferred_quantity: quantity,
        };
      });
    },

    async adjust(auth, input) {
      const operatorId = employeeId(auth);
      const inventoryId = id(input?.inventory_item_id, 'inventory_item_id');
      const actualQuantity = positive(input?.actual_quantity, 'actual_quantity', true, true);
      const note = String(input?.note ?? '').trim();
      if (!note) throw new AppError(400, 'VALIDATION_ERROR', 'Lý do điều chỉnh là bắt buộc');

      return transactionManager.run(async (connection) => {
        const item = await repository.findByIdForUpdate(inventoryId, connection);
        if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng kho');
        if (!['active', 'available'].includes(String(item.status)))
          throw new AppError(409, 'CONFLICT', 'Mặt hàng kho đã ngừng hoạt động');
        const difference = actualQuantity - Number(item.stock);
        await repository.setStock(inventoryId, actualQuantity, connection);
        await repository.addLog(
          {
            inventoryItemId: inventoryId,
            productId: null,
            employeeId: operatorId,
            action: 'adjust',
            quantity: difference,
            importPrice: item.import_price,
            note,
          },
          connection,
        );
        return {
          inventory_item_id: inventoryId,
          before_stock: Number(item.stock),
          actual_quantity: actualQuantity,
          difference,
        };
      });
    },
  };
}
