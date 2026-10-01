import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/services/auth.service.js';

test('register creates a customer with hashed password and customer role', async () => {
  let created;
  const service = createAuthService({
    jwtSecret: 'test-secret-123456',
    userRepository: {
      async findByEmailForAuth() {
        return null;
      },
      async findRoleByName(role) {
        assert.equal(role, 'customer');
        return { role_id: 3, role_name: 'customer' };
      },
      async createCustomer(input) {
        created = input;
        return {
          user_id: 10,
          full_name: input.fullName,
          email: input.email,
          role_name: 'customer',
          status: 'active',
        };
      },
      async findById() {
        return null;
      },
      async listUsers() {
        return [];
      },
      async countUsers() {
        return 0;
      },
    },
    sessionRepository: { async create() {} },
    hashPassword: async (password) => `hash:${password}`,
    verifyPassword: async () => true,
  });
  const result = await service.register({
    full_name: 'Customer Test',
    email: ' TEST@Example.com ',
    password: 'password123',
  });
  assert.equal(result.email, 'test@example.com');
  assert.equal(created.passwordHash, 'hash:password123');
  assert.equal(created.roleId, 3);
});

test('login rejects an incorrect password with generic 401', async () => {
  const service = createAuthService({
    jwtSecret: 'test-secret-123456',
    userRepository: {
      async findByEmailForAuth() {
        return {
          user_id: 10,
          full_name: 'Customer',
          email: 'customer@example.com',
          password_hash: 'hash',
          role_name: 'customer',
          status: 'active',
        };
      },
      async findRoleByName() {
        return { role_id: 3, role_name: 'customer' };
      },
      async findById() {
        return null;
      },
      async listUsers() {
        return [];
      },
      async countUsers() {
        return 0;
      },
      async createCustomer() {
        return null;
      },
    },
    sessionRepository: { async create() {} },
    hashPassword: async (password) => password,
    verifyPassword: async () => false,
  });
  await assert.rejects(
    service.login({ email: 'customer@example.com', password: 'wrong' }),
    (error) => error.status === 401 && error.code === 'UNAUTHENTICATED',
  );
});
