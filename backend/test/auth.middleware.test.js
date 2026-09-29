import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AppError } from '../src/errors/app-error.js';
import { createAuthMiddleware } from '../src/middlewares/auth.middleware.js';

const SECRET = 'test-secret';

function makeResponse() {
  return {
    getHeader() {
      return undefined;
    },
  };
}

function makeNext() {
  const calls = [];
  return Object.assign((error) => calls.push(error), { calls });
}

function makeRequest(token) {
  return {
    auth: undefined,
    get(name) {
      assert.equal(name, 'authorization');
      return token ? `Bearer ${token}` : undefined;
    },
  };
}

test('requireAuth sets req.auth using DB role, not token role', async () => {
  const userRepository = {
    async findById(userId) {
      assert.equal(userId, 101);
      return { user_id: 101, status: 'active', role_name: 'customer' };
    },
  };
  const middleware = createAuthMiddleware({ userRepository, jwtSecret: SECRET });
  const token = jwt.sign({ userId: 101, role: 'admin' }, SECRET, { algorithm: 'HS256' });
  const req = makeRequest(token);
  const next = makeNext();

  await middleware.requireAuth(req, makeResponse(), next);

  assert.deepEqual(req.auth, { userId: 101, role: 'customer' });
  assert.equal(next.calls.length, 1);
  assert.equal(next.calls[0], undefined);
});

test('requireAuth rejects missing token with 401', async () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    jwtSecret: SECRET,
  });
  const req = makeRequest(null);
  const next = makeNext();

  await middleware.requireAuth(req, makeResponse(), next);

  assert.equal(next.calls.length, 1);
  assert.ok(next.calls[0] instanceof AppError);
  assert.equal(next.calls[0].status, 401);
  assert.equal(next.calls[0].code, 'UNAUTHORIZED');
});

test('requireAuth rejects invalid token with 401', async () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    jwtSecret: SECRET,
  });
  const req = makeRequest('not-a-token');
  const next = makeNext();

  await middleware.requireAuth(req, makeResponse(), next);

  assert.equal(next.calls[0].status, 401);
});

test('requireRole rejects authenticated user with wrong role', () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    jwtSecret: SECRET,
  });
  const next = makeNext();
  const req = { auth: { userId: 101, role: 'customer' } };

  middleware.requireRole('admin')(req, makeResponse(), next);

  assert.ok(next.calls[0] instanceof AppError);
  assert.equal(next.calls[0].status, 403);
  assert.equal(next.calls[0].code, 'FORBIDDEN');
});
