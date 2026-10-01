import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductService } from '../src/services/product.service.js';
import { createVoucherService } from '../src/services/voucher.service.js';
import { createUserService } from '../src/services/user.service.js';

test('product service rejects NaN, zero and invalid page values', async () => {
  const service = createProductService({
    repository: { list: async () => ({ rows: [], total: 0 }) },
    categoryRepository: { findById: async () => ({ category_id: 1 }) },
  });
  await assert.rejects(
    service.list({ page: '0', limit: '20' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
  await assert.rejects(
    service.list({ page: 'NaN', limit: '20' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
  await assert.rejects(
    service.create({ product_name: '', barcode: '', unit: 'sp', price: 0, category_id: 1 }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('voucher service rejects invalid percentage and usage limit', async () => {
  const service = createVoucherService({ list: async () => [], create: async () => null });
  await assert.rejects(
    service.create({ code: 'BAD', discount_type: 'percent', discount_value: 101, usage_limit: 1 }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
  await assert.rejects(
    service.create({ code: 'BAD', discount_type: 'fixed', discount_value: 1000, usage_limit: 0 }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('user service soft-delete keeps the user record and changes status', async () => {
  let removed = false;
  const service = createUserService({
    repository: {
      findById: async () => ({
        user_id: 1,
        full_name: 'A',
        email: 'a@a.com',
        role_name: 'customer',
        status: 'active',
        employment_type: 'full_time',
      }),
      softDelete: async () => {
        removed = true;
      },
    },
    hashPassword: async () => 'hash',
  });
  await service.remove(1);
  assert.equal(removed, true);
});
