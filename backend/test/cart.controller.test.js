import test from 'node:test';
import assert from 'node:assert/strict';
import { createCartController } from '../src/controllers/cart.controller.js';

test('cart create ignores client-supplied user_id and uses req.auth', async () => {
  let receivedAuth;
  const service = {
    async create(auth) {
      receivedAuth = auth;
      return { cart_id: 1, user_id: auth.userId, items: [] };
    },
  };

  const controller = createCartController(service);
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };

  await controller.create(
    {
      auth: { userId: 101, role: 'customer' },
      body: { user_id: 202 },
    },
    response,
  );

  assert.deepEqual(receivedAuth, { userId: 101, role: 'customer' });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.user_id, 101);
});
