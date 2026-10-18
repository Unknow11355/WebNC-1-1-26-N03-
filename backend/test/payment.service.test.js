import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPaymentService } from '../src/services/payment.service.js';
import { createPaymentController } from '../src/controllers/payment.controller.js';

const config = {
  tmnCode: 'TESTTMN',
  hashSecret: 'test-secret-that-is-long-enough-for-hmac',
  paymentUrl: 'https://sandbox.example.test/pay',
  returnUrl: 'https://shop.example.test/api/v1/payments/vnpay-return',
  ipnUrl: 'https://api.example.test/api/v1/payments/vnpay-ipn',
};

function signedQuery(overrides = {}) {
  const params = {
    vnp_TxnRef: '42_1792310400000_a1b2c3d4',
    vnp_Amount: '2500000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TmnCode: config.tmnCode,
    vnp_TransactionNo: '123456',
    ...overrides,
  };
  const data = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
  return {
    ...params,
    vnp_SecureHash: crypto.createHmac('sha512', config.hashSecret).update(data).digest('hex'),
  };
}

function setup({ orderOverrides = {}, attemptOverrides = {}, configProvider = () => config } = {}) {
  const order = {
    order_id: 42,
    customer_id: 7,
    final_amount: '25000.00',
    status: 'pending',
    order_status: 'pending',
    payment_status: 'pending',
    ...orderOverrides,
  };
  const attempt = {
    payment_id: 99,
    order_id: 42,
    amount: '25000.00',
    status: 'pending',
    transaction_id: '42_1792310400000_a1b2c3d4',
    ...attemptOverrides,
  };
  const calls = [];
  const paymentRepository = {
    async getOrderForPayment(orderId) {
      calls.push(['getOrder', orderId]);
      return Number(orderId) === order.order_id ? order : null;
    },
    async createVnpayAttempt(...args) {
      calls.push(['createAttempt', ...args]);
    },
    async findVnpayAttempt(orderId, txnRef) {
      calls.push(['findAttempt', orderId, txnRef]);
      return Number(orderId) === attempt.order_id && txnRef === attempt.transaction_id
        ? attempt
        : null;
    },
    async markOrderPaid(currentOrder, currentAttempt, txnRef, gateway) {
      calls.push(['markPaid', txnRef, gateway]);
      currentOrder.payment_status = 'paid';
      currentAttempt.status = 'paid';
      return { ok: true, alreadyPaid: false };
    },
    async markOrderFailed(currentOrder, currentAttempt) {
      calls.push(['markFailed', currentOrder.order_id, currentAttempt.payment_id]);
      currentOrder.payment_status = 'failed';
      currentAttempt.status = 'failed';
      return { ok: true };
    },
  };
  const transactionManager = {
    async run(work) {
      calls.push(['transaction']);
      return work({ connection: true });
    },
  };
  const loyaltyCalls = [];
  const loyaltyService = {
    async earnForPaidOrder(args) {
      loyaltyCalls.push(args);
    },
  };
  const service = createPaymentService({
    paymentRepository,
    transactionManager,
    loyaltyService,
    configProvider,
  });
  return { service, order, attempt, calls, loyaltyCalls };
}

test('VNPAY URL creation stores an attempt and signs a URL using configured credentials', async () => {
  const { service, calls } = setup();
  const result = await service.createVnpayUrl(7, 42, '127.0.0.1');
  const url = new URL(result.paymentUrl);

  assert.equal(url.origin + url.pathname, config.paymentUrl);
  assert.equal(url.searchParams.get('vnp_TmnCode'), config.tmnCode);
  assert.equal(url.searchParams.get('vnp_Amount'), '2500000');
  assert.match(result.txnRef, /^42_\d{13}_[a-f\d]{8}$/i);
  assert.ok(calls.some(([name]) => name === 'createAttempt'));
});

test('VNPAY URL creation rejects orders owned by another customer', async () => {
  const { service } = setup();
  await assert.rejects(service.createVnpayUrl(8, 42, '127.0.0.1'), { code: 'FORBIDDEN' });
});

test('VNPAY configuration has no embedded credential fallback', async () => {
  const { service } = setup({ configProvider: () => ({}) });
  await assert.rejects(service.createVnpayUrl(7, 42, '127.0.0.1'), {
    code: 'PAYMENT_NOT_CONFIGURED',
  });
});

test('a valid VNPAY callback marks the order and earns points in the same transaction', async () => {
  const { service, order, attempt, loyaltyCalls, calls } = setup();
  const result = await service.processVnpayCallback(signedQuery());

  assert.equal(result.rspCode, '00');
  assert.equal(result.paymentStatus, 'paid');
  assert.equal(order.payment_status, 'paid');
  assert.equal(attempt.status, 'paid');
  assert.equal(loyaltyCalls.length, 1);
  assert.equal(loyaltyCalls[0].orderId, 42);
  assert.deepEqual(loyaltyCalls[0].executor, { connection: true });
  assert.ok(calls.indexOf(calls.find(([name]) => name === 'transaction')) < calls.length - 1);
});

test('a repeated successful callback does not earn points again', async () => {
  const { service, loyaltyCalls } = setup({
    orderOverrides: { payment_status: 'paid' },
    attemptOverrides: { status: 'paid' },
  });
  const result = await service.processVnpayCallback(signedQuery());

  assert.equal(result.alreadyPaid, true);
  assert.equal(loyaltyCalls.length, 0);
});

test('invalid signatures and amounts do not change payment state', async () => {
  const invalidSignature = setup();
  const badSignature = { ...signedQuery(), vnp_SecureHash: 'bad' };
  assert.equal((await invalidSignature.service.processVnpayCallback(badSignature)).rspCode, '97');
  assert.equal(
    invalidSignature.calls.some(([name]) => name === 'transaction'),
    false,
  );

  const invalidAmount = setup();
  assert.equal(
    (await invalidAmount.service.processVnpayCallback(signedQuery({ vnp_Amount: '1' }))).rspCode,
    '04',
  );
  assert.equal(
    invalidAmount.calls.some(([name]) => name === 'markPaid'),
    false,
  );
});

test('a callback cannot pay a rejected order', async () => {
  const { service, calls } = setup({ orderOverrides: { status: 'rejected' } });
  const result = await service.processVnpayCallback(signedQuery());

  assert.equal(result.rspCode, '02');
  assert.equal(
    calls.some(([name]) => name === 'markPaid'),
    false,
  );
});

test('a response code of 00 without transaction status 00 is not treated as paid', async () => {
  const { service, order, attempt, calls, loyaltyCalls } = setup();
  const result = await service.processVnpayCallback(signedQuery({ vnp_TransactionStatus: '01' }));

  assert.equal(result.rspCode, '00');
  assert.equal(result.paymentStatus, 'failed');
  assert.equal(order.payment_status, 'failed');
  assert.equal(attempt.status, 'failed');
  assert.equal(
    calls.some(([name]) => name === 'markPaid'),
    false,
  );
  assert.equal(loyaltyCalls.length, 0);
});

test('payment controller reads the authenticated user from req.auth', async () => {
  let receivedUserId;
  const controller = createPaymentController({
    async createVnpayUrl(userId) {
      receivedUserId = userId;
      return { paymentUrl: 'https://example.test' };
    },
  });
  const response = {
    body: null,
    json(body) {
      this.body = body;
      return this;
    },
    status() {
      return this;
    },
  };

  await controller.createVnpay(
    { auth: { userId: 7 }, body: { order_id: 42 }, headers: {}, ip: '127.0.0.1' },
    response,
  );

  assert.equal(receivedUserId, 7);
  assert.equal(response.body.success, true);
});
