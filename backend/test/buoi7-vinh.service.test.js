import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createAuthService } from '../src/services/auth.service.js';
import { createProductService } from '../src/services/product.service.js';
test('Buổi 7 password change verifies current password and revokes all sessions in one transaction', async () => {
  const calls = [];
  const service = createAuthService({
    userRepository: {
      findById: async () => ({ user_id: 5, status: 'active', password_hash: 'old-hash' }),
      updateUser: async (id, data) => calls.push(['updateUser', id, data]),
    },
    sessionRepository: {
      revokeAllForUser: async (id) => calls.push(['revokeAllForUser', id]),
    },
    jwtSecret: 'this-is-a-test-secret-123',
    hashPassword: async (value) => `hash:${value}`,
    verifyPassword: async (value, hash) => value === 'old-password' && hash === 'old-hash',
    transactionManager: { run: async (work) => work({ execute: async () => {} }) },
  });
  const result = await service.changePassword(5, {
    current_password: 'old-password',
    new_password: 'new-password',
  });
  assert.deepEqual(result, { password_changed: true });
  assert.deepEqual(calls, [
    ['updateUser', 5, { passwordHash: 'hash:new-password' }],
    ['revokeAllForUser', 5],
  ]);
});

test('Buổi 7 password reset stores a SHA-256 hash and consumes token exactly once', async () => {
  let stored;
  let used = false;
  const token = 'a'.repeat(64);
  const userRepository = {
    findByEmailForAuth: async () => ({ user_id: 6, status: 'active', password_hash: 'old' }),
    createPasswordResetToken: async (data) => {
      stored = data;
    },
    findActivePasswordResetToken: async (tokenHash) => {
      assert.equal(tokenHash, createHash('sha256').update(token).digest('hex'));
      return used ? null : { token_id: 11, user_id: 6 };
    },
    updateUser: async () => {},
    markPasswordResetUsed: async () => {
      used = true;
    },
  };
  const service = createAuthService({
    userRepository,
    sessionRepository: { revokeAllForUser: async () => {} },
    jwtSecret: 'this-is-a-test-secret-123',
    hashPassword: async (value) => `hash:${value}`,
    verifyPassword: async () => true,
    transactionManager: { run: async (work) => work({ execute: async () => {} }) },
    exposeResetToken: true,
    resetTokenGenerator: () => token,
  });
  const request = await service.requestPasswordReset({ email: 'reset@example.com' });
  assert.equal(request.accepted, true);
  assert.equal(request.reset_token, token);
  assert.equal(stored.tokenHash, createHash('sha256').update(token).digest('hex'));
  assert.match(stored.expiresAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  await service.confirmPasswordReset({ token, new_password: 'new-reset-password' });
  await assert.rejects(
    service.confirmPasswordReset({ token, new_password: 'new-reset-password' }),
    { code: 'VALIDATION_ERROR' },
  );
});

test('Buổi 7 soft-delete of product is audited in the same transaction', async () => {
  const calls = [];
  const service = createProductService({
    repository: {
      findById: async () => ({ product_id: 4, status: 'active' }),
      softDelete: async () => {
        calls.push('delete');
        return 1;
      },
    },
    transactionManager: { run: async (work) => work({ execute: async () => {} }) },
    auditRepository: { create: async () => calls.push('audit') },
  });
  await service.softDelete(4, { userId: 9, requestId: '00000000-0000-0000-0000-000000000009' });
  assert.deepEqual(calls, ['delete', 'audit']);
});
