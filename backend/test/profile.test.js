import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/services/auth.service.js';

function fixture() {
  const row = {
    user_id: 3,
    full_name: 'Khách hàng',
    email: 'customer@test.local',
    phone: '0901234567',
    address: 'Hà Nội',
    role_name: 'customer',
    status: 'active',
    password_hash: 'secret',
  };
  const writes = [];
  const repository = {
    async findById(id) {
      assert.equal(id, 3);
      return row;
    },
    async updateUser(id, data) {
      writes.push({ id, data });
      if (data.fullName !== undefined) row.full_name = data.fullName;
      if (data.phone !== undefined) row.phone = data.phone;
      if (data.address !== undefined) row.address = data.address;
      return row;
    },
  };
  return {
    row,
    writes,
    repository,
    service: createAuthService({
      userRepository: repository,
      sessionRepository: {},
      jwtSecret: 'test-profile-secret-only',
    }),
  };
}
test('profile updates only current identity and returns no password hash', async () => {
  const f = fixture();
  const result = await f.service.updateMe(3, {
    full_name: '  Linh Nguyễn  ',
    phone: '+84901234567',
    address: '  Hà Nội  ',
  });
  assert.equal(f.writes[0].id, 3);
  assert.equal(result.full_name, 'Linh Nguyễn');
  assert.equal(result.address, 'Hà Nội');
  assert.equal(result.password_hash, undefined);
  assert.equal(result.role_name, 'customer');
});
test('profile rejects privilege and identity changes before write', async () => {
  for (const key of ['user_id', 'role_name', 'role_id', 'status', 'email', 'password', 'points']) {
    const f = fixture();
    await assert.rejects(f.service.updateMe(3, { full_name: 'Hợp lệ', [key]: '1' }), {
      status: 400,
    });
    assert.equal(f.writes.length, 0);
  }
});
test('profile patch preserves omitted values and clears blank optional values', async () => {
  const f = fixture();
  const result = await f.service.updateMe(3, { phone: '', address: null });
  assert.equal(result.phone, null);
  assert.equal(result.address, null);
  assert.equal(result.full_name, 'Khách hàng');
});
test('profile rejects invalid shapes, lengths and types without writing', async () => {
  for (const body of [
    null,
    [],
    {},
    'text',
    { full_name: ' ' },
    { full_name: 'a'.repeat(101) },
    { full_name: 12 },
    { phone: 123 },
    { phone: 'abc' },
    { phone: '1'.repeat(16) },
    { address: 'x'.repeat(256) },
    { address: [] },
  ]) {
    const f = fixture();
    await assert.rejects(f.service.updateMe(3, body), { status: 400 });
    assert.equal(f.writes.length, 0);
  }
});
test('profile duplicate phone gets a safe conflict', async () => {
  const f = fixture();
  f.repository.updateUser = async () => {
    throw Object.assign(new Error('secret sql'), { code: 'ER_DUP_ENTRY' });
  };
  await assert.rejects(f.service.updateMe(3, { phone: '0901234567' }), {
    status: 409,
    code: 'CONFLICT',
  });
});
test('profile inactive user cannot write', async () => {
  const f = fixture();
  f.row.status = 'locked';
  await assert.rejects(f.service.updateMe(3, { full_name: 'Tên khác' }), { status: 401 });
  assert.equal(f.writes.length, 0);
});
