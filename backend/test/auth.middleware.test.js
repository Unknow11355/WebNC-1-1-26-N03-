import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AppError } from '../src/errors/app-error.js';
import { createAuthMiddleware } from '../src/middlewares/auth.middleware.js';

const SECRET = 'test-secret-123456';

function nextSpy() {
  const calls = [];
  return Object.assign((error) => calls.push(error), { calls });
}

test('requireAuth sets req.auth using DB role and active session, not token role', async () => {
  const jti = 'session-101';
  const middleware = createAuthMiddleware({
    userRepository: {
      async findById(userId) {
        return { user_id: userId, status: 'active', role_name: 'customer' };
      },
    },
    sessionRepository: {
      async findActiveById(sessionId) {
        assert.equal(sessionId, jti);
        return { session_id: jti, user_id: 101 };
      },
    },
    jwtSecret: SECRET,
  });
  const token = jwt.sign({ userId: 101, role: 'admin' }, SECRET, {
    algorithm: 'HS256',
    jwtid: jti,
  });
  const req = {
    get(name) {
      assert.equal(name, 'authorization');
      return `Bearer ${token}`;
    },
  };
  const next = nextSpy();

  await middleware.requireAuth(req, {}, next);
  assert.deepEqual(req.auth, { userId: 101, role: 'customer' });
  assert.equal(req.sessionId, jti);
  assert.equal(next.calls.length, 1);
  assert.equal(next.calls[0], undefined);
});

test('requireAuth rejects missing token with 401', async () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    sessionRepository: { findActiveById: async () => null },
    jwtSecret: SECRET,
  });
  const req = { get: () => undefined };
  const next = nextSpy();
  await middleware.requireAuth(req, {}, next);
  assert.equal(next.calls[0].status, 401);
  assert.equal(next.calls[0].code, 'UNAUTHORIZED');
});

test('requireAuth rejects invalid token with 401', async () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    sessionRepository: { findActiveById: async () => null },
    jwtSecret: SECRET,
  });
  const req = { get: () => 'Bearer not-a-token' };
  const next = nextSpy();
  await middleware.requireAuth(req, {}, next);
  assert.ok(next.calls[0] instanceof AppError);
  assert.equal(next.calls[0].status, 401);
});

test('revoked or expired server session rejects an otherwise valid JWT', async () => {
  const token = jwt.sign({ userId: 101 }, SECRET, { algorithm: 'HS256', jwtid: 'revoked-session' });
  const middleware = createAuthMiddleware({
    userRepository: {
      findById: async () => ({ user_id: 101, status: 'active', role_name: 'customer' }),
    },
    sessionRepository: { findActiveById: async () => null },
    jwtSecret: SECRET,
  });
  const req = { get: () => `Bearer ${token}` };
  const next = nextSpy();
  await middleware.requireAuth(req, {}, next);
  assert.equal(next.calls[0].status, 401);
});

test('requireRole rejects authenticated user with wrong role', () => {
  const middleware = createAuthMiddleware({
    userRepository: { findById: async () => null },
    sessionRepository: { findActiveById: async () => null },
    jwtSecret: SECRET,
  });
  const next = nextSpy();
  middleware.requireRole('admin')({ auth: { userId: 101, role: 'customer' } }, {}, next);
  assert.ok(next.calls[0] instanceof AppError);
  assert.equal(next.calls[0].status, 403);
});
