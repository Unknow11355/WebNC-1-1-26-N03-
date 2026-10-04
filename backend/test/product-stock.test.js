import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductService } from '../src/services/product.service.js';

test('product creation supplies zero stock to repository and ignores client stock', async () => {
  const service = createProductService({ create: async (data) => data });
  const product = await service.create({
    product_name: 'Milk',
    barcode: 'TEST',
    unit: 'box',
    price: 15000,
    category_id: 1,
    stock: 999,
  });
  assert.equal(product.stock, 0);
});
