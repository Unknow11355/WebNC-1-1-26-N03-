import assert from 'node:assert/strict';
import test from 'node:test';
import { createVoucherRepository } from '../src/repositories/voucher.repository.js';
import { calculateVoucherDiscount, createVoucherService } from '../src/services/voucher.service.js';
import { createOrderService } from '../src/services/order.service.js';

const activeVoucher = (overrides = {}) => ({
  voucher_id: 4,
  code: 'SALE10',
  status: 'active',
  expiry_date: '2026-10-18',
  usage_limit: 3,
  used_count: 2,
  discount_type: 'percent',
  discount_value: 10,
  min_order_amount: 0,
  max_discount: null,
  ...overrides,
});

test('CN11: expiry uses an inclusive Vietnam calendar date', () => {
  assert.equal(
    calculateVoucherDiscount(activeVoucher(), 100_000, '2026-10-18').discount_amount,
    10_000,
  );
  assert.throws(
    () =>
      calculateVoucherDiscount(activeVoucher({ expiry_date: '2026-10-17' }), 100_000, '2026-10-18'),
    { code: 'EXPIRED', status: 410 },
  );
});

test('CN11: concurrent redemptions at the last global use allow only one increment', async () => {
  const state = { used: 2, limit: 3 };
  const db = {
    async execute(sql) {
      if (sql.includes('UPDATE vouchers SET used_count = used_count + 1')) {
        if (state.used >= state.limit) return [{ affectedRows: 0 }];
        state.used += 1;
        return [{ affectedRows: 1 }];
      }
      throw new Error('Unexpected query');
    },
  };
  const repository = createVoucherRepository(db);
  const results = await Promise.allSettled([
    repository.incrementUsed(4),
    repository.incrementUsed(4),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(state.used, state.limit);
});

test('CN11: a rejected online order restores both global and customer voucher use', async () => {
  const calls = [];
  const repository = createVoucherRepository({
    async execute(sql, params) {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  });
  await repository.decrementUsed(4);
  await repository.decrementCustomerUsed(7, 4);
  assert.match(calls[0].sql, /GREATEST\(used_count - 1, 0\)/);
  assert.match(calls[1].sql, /user_id = \? AND voucher_id = \? AND used_count > 0/);
  assert.deepEqual(calls[1].params, [7, 4]);
});

test('CN11: rejecting a pending order restores voucher use once in the transaction', async () => {
  const events = [];
  const order = {
    order_id: 12,
    customer_id: 7,
    employee_id: null,
    voucher_id: 4,
    status: 'pending',
    payment_status: 'pending',
  };
  const service = createOrderService({
    transactionManager: { run: (work) => work({}) },
    orderRepository: {
      async findById() {
        return { ...order };
      },
      async getItems() {
        return [];
      },
      async updateStatus(_id, data) {
        Object.assign(order, data);
        return { ...order };
      },
    },
    voucherRepository: {
      async decrementUsed(id) {
        events.push(['global', id]);
      },
      async decrementCustomerUsed(customerId, id) {
        events.push(['customer', customerId, id]);
      },
    },
  });
  await service.reject({ userId: 9, role: 'employee' }, 12, { reason: 'Hết hàng' });
  await assert.rejects(service.reject({ userId: 9, role: 'employee' }, 12, { reason: 'Lặp lại' }));
  assert.deepEqual(events, [
    ['global', 4],
    ['customer', 7, 4],
  ]);
});

test('CN11: expired voucher claim is rejected before saving it', async () => {
  let claimed = false;
  const service = createVoucherService(
    {
      findByCode: async () => activeVoucher({ expiry_date: '2026-10-17' }),
      claimForCustomer: async () => {
        claimed = true;
      },
      findCustomerVoucher: async () => null,
    },
    { run: (work) => work({}) },
  );
  await assert.rejects(service.claim({ userId: 7, role: 'customer' }, { voucher_code: 'SALE10' }), {
    code: 'EXPIRED',
    status: 410,
  });
  assert.equal(claimed, false);
});
