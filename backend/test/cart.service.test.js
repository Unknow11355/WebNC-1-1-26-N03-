import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/errors/app-error.js';
import { createCartService } from '../src/services/cart.service.js';

function makeService({
  users = new Map([
    [101, { user_id: 101, status: 'active', role_name: 'customer' }],
    [202, { user_id: 202, status: 'active', role_name: 'customer' }],
  ]),
  carts = new Map(),
} = {}) {
  let nextCartId = 1;

  const userRepository = {
    async findById(userId) {
      return users.get(userId) ?? null;
    },
  };

  const cartRepository = {
    async findByUserId(userId) {
      return carts.get(userId) ?? null;
    },

    async findById(cartId) {
      for (const cart of carts.values()) {
        if (Number(cart.cart_id) === Number(cartId)) return cart;
      }
      return null;
    },

    async create({ userId }) {
      const cart = {
        cart_id: nextCartId++,
        user_id: userId,
        created_at: '2026-09-26T00:00:00.000Z',
        items: [],
      };
      carts.set(userId, cart);
      return cart;
    },
  };

  return createCartService({ cartRepository, userRepository });
}

test('customer A creates and reads their own cart', async () => {
  const service = makeService();

  const created = await service.create({ userId: 101, role: 'customer' });
  assert.equal(created.user_id, 101);

  const result = await service.getById({ userId: 101, role: 'customer' }, created.cart_id);
  assert.equal(result.user_id, 101);
});

test('customer B cannot read customer A cart', async () => {
  const service = makeService();

  const created = await service.create({ userId: 101, role: 'customer' });

  await assert.rejects(
    service.getById({ userId: 202, role: 'customer' }, created.cart_id),
    (error) => error instanceof AppError && error.status === 403 && error.code === 'FORBIDDEN',
  );
});

test('customer cannot create a second cart', async () => {
  const service = makeService();

  await service.create({ userId: 101, role: 'customer' });

  await assert.rejects(
    service.create({ userId: 101, role: 'customer' }),
    (error) =>
      error instanceof AppError && error.status === 409 && error.code === 'CART_ALREADY_EXISTS',
  );
});

test('non-customer cannot create a cart', async () => {
  const users = new Map([[303, { user_id: 303, status: 'active', role_name: 'employee' }]]);
  const service = makeService({ users });

  await assert.rejects(
    service.create({ userId: 303, role: 'employee' }),
    (error) => error instanceof AppError && error.status === 403,
  );
});

test('invalid cart id is rejected', async () => {
  const service = makeService();

  await assert.rejects(
    service.getById({ userId: 101, role: 'customer' }, 'abc'),
    (error) =>
      error instanceof AppError && error.status === 400 && error.code === 'VALIDATION_ERROR',
  );
});
