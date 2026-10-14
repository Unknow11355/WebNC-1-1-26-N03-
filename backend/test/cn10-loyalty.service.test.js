import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoyaltyService,
  POINTS_PER_VND,
  VND_PER_POINT,
} from '../src/services/loyalty.service.js';

function createRepo(initialPoints = 25) {
  const state = {
    member: {
      user_id: 7,
      full_name: 'Customer CN10',
      email: 'cn10@example.local',
      phone: '0900000000',
      address: 'Ha Noi',
      points: initialPoints,
      membership_code: 'MEM00000007',
      status: 'active',
      role_name: 'customer',
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    transactions: [],
    orderUpdates: [],
  };

  return {
    state,
    async findCustomerById() {
      return { ...state.member };
    },
    async searchCustomers() {
      return { rows: [{ ...state.member }], total: 1 };
    },
    async listHistory() {
      return { rows: state.transactions.map((x) => ({ ...x })), total: state.transactions.length };
    },
    async findTransactionByOrderType(orderId, type) {
      return (
        state.transactions.find((x) => Number(x.order_id) === Number(orderId) && x.type === type) ??
        null
      );
    },
    async createTransaction(data) {
      if (
        state.transactions.some(
          (x) => Number(x.order_id) === Number(data.orderId) && x.type === data.type,
        )
      ) {
        const error = new Error('duplicate');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      state.transactions.push({
        loyalty_id: state.transactions.length + 1,
        user_id: data.userId,
        order_id: data.orderId,
        points_change: data.pointsChange,
        type: data.type,
        note: data.note,
        created_at: new Date(),
      });
      return state.transactions.length;
    },
    async incrementPoints(_userId, points) {
      state.member.points += points;
      return 1;
    },
    async decrementPoints(_userId, points) {
      if (state.member.points < points) return 0;
      state.member.points -= points;
      return 1;
    },
    async updateOrderPoints(orderId, data) {
      state.orderUpdates.push({ orderId, ...data });
    },
  };
}

test('preview redemption follows CN10 conversion rule', () => {
  const service = createLoyaltyService({ repository: createRepo().state });
  assert.equal(POINTS_PER_VND, 10_000);
  assert.equal(VND_PER_POINT, 1_000);
  assert.deepEqual(service.previewRedemption({ pointsUsed: 5, eligibleAmount: 12_000 }), {
    points_used: 5,
    points_discount: 5_000,
    final_amount: 7_000,
    max_points: 12,
  });
});

test('redeem decreases points and is idempotent by order/type', async () => {
  const repo = createRepo(10);
  const service = createLoyaltyService({ repository: repo });
  const first = await service.redeemForOrder({
    customerId: 7,
    orderId: 101,
    pointsUsed: 6,
    eligibleAmount: 10_000,
    executor: {},
  });
  const second = await service.redeemForOrder({
    customerId: 7,
    orderId: 101,
    pointsUsed: 6,
    eligibleAmount: 10_000,
    executor: {},
  });
  assert.equal(first.points_used, 6);
  assert.equal(second.points_used, first.points_used);
  assert.equal(second.points_discount, first.points_discount);
  assert.equal(repo.state.member.points, 4);
  assert.equal(repo.state.transactions.filter((x) => x.type === 'redeem').length, 1);
});

test('redeem rejects when balance is insufficient', async () => {
  const repo = createRepo(3);
  const service = createLoyaltyService({ repository: repo });
  await assert.rejects(
    service.redeemForOrder({
      customerId: 7,
      orderId: 102,
      pointsUsed: 4,
      eligibleAmount: 10_000,
      executor: {},
    }),
    (error) => error.code === 'INSUFFICIENT_POINTS' && error.status === 409,
  );
  assert.equal(repo.state.member.points, 3);
  assert.equal(repo.state.transactions.length, 0);
});

test('unpaid orders cannot earn points', async () => {
  const repo = createRepo(3);
  const service = createLoyaltyService({ repository: repo });
  await assert.rejects(
    service.earnForPaidOrder({
      customerId: 7,
      orderId: 103,
      finalAmount: 100_000,
      paymentStatus: 'pending',
      executor: {},
    }),
    (error) => error.code === 'BUSINESS_RULE_VIOLATION' && error.status === 422,
  );
  assert.equal(repo.state.member.points, 3);
  assert.equal(repo.state.transactions.length, 0);
});

test('paid order earns once and repeated callback does not double', async () => {
  const repo = createRepo(3);
  const service = createLoyaltyService({ repository: repo });
  const first = await service.earnForPaidOrder({
    customerId: 7,
    orderId: 104,
    finalAmount: 95_000,
    paymentStatus: 'paid',
    executor: {},
  });
  const second = await service.earnForPaidOrder({
    customerId: 7,
    orderId: 104,
    finalAmount: 95_000,
    paymentStatus: 'paid',
    executor: {},
  });
  assert.equal(first, 9);
  assert.equal(second, 9);
  assert.equal(repo.state.member.points, 12);
  assert.equal(repo.state.transactions.filter((x) => x.type === 'earn').length, 1);
});

test('release restores redeemed points only once', async () => {
  const repo = createRepo(4);
  const service = createLoyaltyService({ repository: repo });
  await service.redeemForOrder({
    customerId: 7,
    orderId: 105,
    pointsUsed: 4,
    eligibleAmount: 5_000,
    executor: {},
  });
  assert.equal(repo.state.member.points, 0);
  assert.equal(
    await service.releaseForOrder({ customerId: 7, orderId: 105, pointsUsed: 4, executor: {} }),
    4,
  );
  assert.equal(
    await service.releaseForOrder({ customerId: 7, orderId: 105, pointsUsed: 4, executor: {} }),
    4,
  );
  assert.equal(repo.state.member.points, 4);
  assert.equal(repo.state.transactions.filter((x) => x.type === 'release').length, 1);
});

test('member search is employee/admin only and never exposes credentials', async () => {
  const repo = createRepo(20);
  const service = createLoyaltyService({ repository: repo });
  const result = await service.search(
    { role: 'employee' },
    { q: 'MEM00000007', page: 1, limit: 20 },
  );
  assert.equal(result.data[0].membership_code, 'MEM00000007');
  assert.equal('password' in result.data[0], false);
  await assert.rejects(
    service.search({ role: 'customer', userId: 7 }, { q: '' }),
    /Không có quyền/,
  );
});
