import test from 'node:test';
import assert from 'node:assert/strict';
import { createPosService } from '../src/services/pos.service.js';

function makeRepository(overrides = {}) {
  const state = {
    products: new Map([
      [1, { product_id: 1, product_name: 'P1', price: '10000.00', stock: 10, status: 'active' }],
      [2, { product_id: 2, product_name: 'P2', price: '20000.00', stock: 5, status: 'active' }],
    ]),
    sales: new Map(),
    nextSaleRequestId: 1,
    nextOrderId: 100,
    calls: [],
  };

  const repository = {
    async createSaleRequest(data) {
      state.calls.push(['createSaleRequest', data]);
      const key = `${data.actorId}:${data.operation}:${data.requestKey}`;
      if (state.sales.has(key)) {
        const error = new Error('Duplicate');
        error.code = 'ER_DUP_ENTRY';
        error.sqlMessage = 'Duplicate for uq_sale_requests_actor_operation_key';
        throw error;
      }
      const id = state.nextSaleRequestId++;
      state.sales.set(key, {
        sale_request_id: id,
        actor_id: data.actorId,
        operation: data.operation,
        request_key: data.requestKey,
        request_hash: data.requestHash,
        order_id: null,
      });
      return { sale_request_id: id };
    },

    async findSaleRequest(actorId, operation, requestKey) {
      for (const sale of state.sales.values()) {
        if (
          sale.actor_id === actorId &&
          sale.operation === operation &&
          sale.request_key === requestKey
        )
          return sale;
      }
      return null;
    },

    async findCustomer(customerId) {
      return { user_id: customerId, role_name: 'customer', status: 'active' };
    },

    async findCurrentShift() {
      return null;
    },

    async findProductForUpdate(productId) {
      const product = state.products.get(productId);
      return product ? { ...product } : null;
    },

    async decrementProductStock(productId, quantity) {
      const product = state.products.get(productId);
      if (!product || product.stock < quantity) return 0;
      product.stock -= quantity;
      state.calls.push(['decrementProductStock', productId, quantity]);
      return 1;
    },

    async createOfflineOrder(data) {
      const id = state.nextOrderId++;
      state.calls.push(['createOfflineOrder', id, data]);
      state.orders = state.orders ?? new Map();
      state.orders.set(id, {
        order_id: id,
        employee_id: data.employeeId,
        customer_id: data.customerId,
        shift_id: data.shiftId,
        total_amount: data.totalAmount,
        discount_amount: data.discountAmount,
        final_amount: data.finalAmount,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid',
        order_status: 'completed',
        note: data.note,
      });
      return id;
    },

    async createOrderItem(data) {
      state.calls.push(['createOrderItem', data]);
    },

    async createPayment(data) {
      state.calls.push(['createPayment', data]);
    },

    async updateSaleRequestOrderId(saleRequestId, orderId) {
      for (const sale of state.sales.values()) {
        if (sale.sale_request_id === saleRequestId) sale.order_id = orderId;
      }
    },

    async findOrderForReplay(orderId) {
      return state.orders.get(orderId) ?? null;
    },

    async findOrderItems() {
      return [];
    },

    ...overrides,
  };

  return { repository, state };
}

function makeTransactionManager() {
  return {
    async run(work) {
      return work({});
    },
  };
}

const employee = { userId: 7, role: 'employee' };

test('POS merges duplicate products and locks them in ascending product_id', async () => {
  const { repository, state } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  const result = await service.sellCash(employee, 'REQ-001', {
    items: [
      { product_id: 2, quantity: 1 },
      { product_id: 1, quantity: 1 },
      { product_id: 1, quantity: 2 },
    ],
    payment_method: 'cash',
  });

  assert.equal(result.replayed, false);
  assert.deepEqual(
    state.calls
      .filter(([name]) => name === 'decrementProductStock')
      .map(([, productId]) => productId),
    [1, 2],
  );
  assert.equal(state.products.get(1).stock, 7);
  assert.equal(state.products.get(2).stock, 4);
});

test('POS rejects client supplied employee_id and total_amount', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash(employee, 'REQ-002', {
      employee_id: 999,
      total_amount: 1,
      items: [{ product_id: 1, quantity: 1 }],
    }),
    { code: 'BUSINESS_RULE_VIOLATION' },
  );
});

test('POS rejects non-cash payment in Buoi 6', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash(employee, 'REQ-003', {
      payment_method: 'vnpay',
      items: [{ product_id: 1, quantity: 1 }],
    }),
    { code: 'BUSINESS_RULE_VIOLATION' },
  );
});

test('POS rejects insufficient stock before creating the order', async () => {
  const { repository, state } = makeRepository({
    async findProductForUpdate() {
      return {
        product_id: 1,
        product_name: 'P1',
        price: '10000.00',
        stock: 0,
        status: 'active',
      };
    },
  });

  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash(employee, 'REQ-004', {
      items: [{ product_id: 1, quantity: 1 }],
    }),
    { code: 'INSUFFICIENT_STOCK' },
  );

  assert.equal(state.calls.filter(([name]) => name === 'createOfflineOrder').length, 0);
});

test('same actor + key + payload replays the same order', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  const input = {
    customer_id: null,
    items: [{ product_id: 1, quantity: 1 }],
  };

  const first = await service.sellCash(employee, 'REQ-005', input);
  const second = await service.sellCash(employee, 'REQ-005', input);

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.data.order_id, first.data.order_id);
});

test('same actor + key with different payload returns KEY_REUSE_CONFLICT', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await service.sellCash(employee, 'REQ-006', {
    items: [{ product_id: 1, quantity: 1 }],
  });

  await assert.rejects(
    service.sellCash(employee, 'REQ-006', {
      items: [{ product_id: 1, quantity: 2 }],
    }),
    { code: 'KEY_REUSE_CONFLICT' },
  );
});

test('POS requires a valid Idempotency-Key', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash(employee, '', {
      items: [{ product_id: 1, quantity: 1 }],
    }),
    { code: 'VALIDATION_ERROR' },
  );
});

test('POS requires employee or admin role', async () => {
  const { repository } = makeRepository();
  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash({ userId: 7, role: 'customer' }, 'REQ-008', {
      items: [{ product_id: 1, quantity: 1 }],
    }),
    { code: 'FORBIDDEN' },
  );
});

test('POS rejects inactive products', async () => {
  const { repository } = makeRepository({
    async findProductForUpdate() {
      return {
        product_id: 2,
        product_name: 'P2',
        price: '20000.00',
        stock: 5,
        status: 'inactive',
      };
    },
  });

  const service = createPosService({
    repository,
    transactionManager: makeTransactionManager(),
  });

  await assert.rejects(
    service.sellCash(employee, 'REQ-009', {
      items: [{ product_id: 2, quantity: 1 }],
    }),
    { code: 'CONFLICT' },
  );
});
