import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryService } from '../src/services/inventory.service.js';

test('inventory import keeps stock update and log in one transaction', async () => {
  const calls = [];
  const service = createInventoryService({
    transactionManager: {
      async run(work) {
        calls.push('begin');
        const result = await work({ tag: 'connection' });
        calls.push('commit');
        return result;
      },
    },
    repository: {
      async findByIdForUpdate() {
        return {
          inventory_item_id: 1,
          price: 20000,
          import_price: 10000,
          stock: 5,
          status: 'available',
        };
      },
      async increaseStock(id, quantity, connection) {
        calls.push(['increase', id, quantity, connection.tag]);
      },
      async addLog(data, connection) {
        calls.push(['log', data.employeeId, data.action, data.quantity, connection.tag]);
      },
      async findById() {
        return { inventory_item_id: 1, stock: 15 };
      },
    },
    productRepository: {},
  });
  const result = await service.importStock(
    { userId: 9, role: 'employee' },
    { inventory_item_id: 1, quantity: 10, import_price: 12000, note: 'Nhap hang' },
  );
  assert.equal(result.stock, 15);
  assert.deepEqual(calls, [
    'begin',
    ['increase', 1, 10, 'connection'],
    ['log', 9, 'import', 10, 'connection'],
    'commit',
  ]);
});

test('inventory export rejects before writes when stock is insufficient', async () => {
  const service = createInventoryService({
    transactionManager: {
      async run(work) {
        return work({});
      },
    },
    repository: {
      async findByIdForUpdate() {
        return {
          inventory_item_id: 1,
          stock: 2,
          price: 20000,
          import_price: 10000,
          status: 'available',
        };
      },
    },
    productRepository: {},
  });
  await assert.rejects(
    service.exportToShelf(
      { userId: 9, role: 'employee' },
      { inventory_item_id: 1, quantity: 3, note: 'Dua len ke' },
    ),
    (error) => error.status === 409 && error.code === 'INSUFFICIENT_STOCK',
  );
});
