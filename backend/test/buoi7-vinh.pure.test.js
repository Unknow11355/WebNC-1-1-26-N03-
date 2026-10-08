import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductService } from '../src/services/product.service.js';
import { createReportService } from '../src/services/report.service.js';
import { createAuditService } from '../src/services/audit.service.js';
import { createNotificationService } from '../src/services/notification.service.js';

function admin() {
  return { userId: 1, role: 'admin' };
}

test('Buổi 7 product search passes the full filter and deterministic sort to the repository', async () => {
  let args;
  const service = createProductService({
    async list(value) {
      args = value;
      return { rows: [{ product_id: 1 }], total: 1 };
    },
  });
  const result = await service.list({
    q: 'milk',
    category_id: '2',
    min_price: '10000',
    max_price: '50000',
    in_stock: 'true',
    sort: 'price',
    order: 'desc',
    page: '2',
    limit: '20',
  });
  assert.deepEqual(args, {
    q: 'milk',
    categoryId: 2,
    minPrice: 10000,
    maxPrice: 50000,
    inStock: true,
    sort: 'price',
    order: 'desc',
    limit: 20,
    offset: 20,
  });
  assert.equal(result.meta.totalPages, 1);
});

test('Buổi 7 product search rejects invalid boolean and min/max', async () => {
  const service = createProductService({ list: async () => ({ rows: [], total: 0 }) });
  await assert.rejects(service.list({ in_stock: 'yes' }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.list({ min_price: 500, max_price: 100 }), {
    code: 'VALIDATION_ERROR',
  });
  await assert.rejects(service.list({ q: 'x'.repeat(101) }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.list({ sort: 'price;DROP TABLE products' }), {
    code: 'VALIDATION_ERROR',
  });
});

test('Buổi 7 report service requires admin and validates date window', async () => {
  let received;
  const service = createReportService({
    revenue: async (window) => {
      received = window;
      return { summary: { order_count: 0 }, series: [] };
    },
    products: async () => [],
    employees: async () => [],
  });
  const result = await service.revenue(admin(), { from: '2026-10-01', to: '2026-10-01' });
  assert.equal(result.meta.timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(received.fromTimestamp, '2026-10-01 00:00:00');
  assert.equal(received.toTimestamp, '2026-10-02 00:00:00');
  await assert.rejects(
    service.revenue({ userId: 2, role: 'employee' }, { from: '2026-10-01', to: '2026-10-01' }),
    { code: 'FORBIDDEN' },
  );
  await assert.rejects(service.revenue(admin(), { from: '2026-01-01', to: '2027-01-02' }), {
    code: 'VALIDATION_ERROR',
  });
});

test('Buổi 7 report service converts an inclusive date filter into a local half-open window', async () => {
  let received;
  const service = createReportService({
    revenue: async (window) => {
      received = window;
      return { summary: {}, series: [] };
    },
    products: async () => [],
    employees: async () => [],
  });
  await service.revenue(admin(), { from: '2026-10-31', to: '2026-11-01' });
  assert.equal(received.fromTimestamp, '2026-10-31 00:00:00');
  assert.equal(received.toTimestamp, '2026-11-02 00:00:00');
});

test('Buổi 7 audit service exposes admin-only paginated search', async () => {
  let params;
  const service = createAuditService({
    repository: {
      list: async (value) => {
        params = value;
        return { rows: [], total: 0 };
      },
    },
  });
  const result = await service.list(admin(), {
    actor_id: '4',
    action: 'LOGIN_FAILURE',
    outcome: 'FAILURE',
    from: '2026-10-01',
    to: '2026-10-02',
    page: '2',
    limit: '10',
  });
  assert.equal(result.meta.page, 2);
  assert.equal(params.actorId, 4);
  assert.equal(params.from, '2026-10-01 00:00:00');
  assert.equal(params.to, '2026-10-03 00:00:00');
  await assert.rejects(service.list({ userId: 4, role: 'employee' }, {}), { code: 'FORBIDDEN' });
});

test('Buổi 7 notification service restricts access by recipient owner', async () => {
  let listArgs;
  const service = createNotificationService({
    async listForUser(userId, page) {
      listArgs = { userId, page };
      return { rows: [{ notification_id: 9, is_read: false }], total: 1 };
    },
    async markRead(userId, notificationId) {
      assert.equal(userId, 8);
      assert.equal(notificationId, 9);
      return 1;
    },
  });
  const result = await service.list({ userId: 8, role: 'customer' }, { page: '1', limit: '20' });
  assert.equal(result.data[0].notification_id, 9);
  assert.equal(listArgs.userId, 8);
  assert.deepEqual(await service.markRead({ userId: 8 }, 9), { notification_id: 9, is_read: true });
});

test('Buổi 7 soft-delete of inventory item is audited in the same transaction', async () => {
  const calls = [];
  const { createInventoryService } = await import('../src/services/inventory.service.js');
  const service = createInventoryService({
    repository: {
      findById: async () => ({ inventory_item_id: 4, status: 'available' }),
      softDelete: async () => {
        calls.push('delete');
        return 1;
      },
      list: async () => ({ rows: [], total: 0 }),
      listLogs: async () => ({ rows: [], total: 0 }),
    },
    productRepository: {},
    transactionManager: { run: async (work) => work({ execute: async () => {} }) },
    auditRepository: { create: async () => calls.push('audit') },
  });
  await service.remove(4, { userId: 9, requestId: '00000000-0000-0000-0000-000000000009' });
  assert.deepEqual(calls, ['delete', 'audit']);
});
