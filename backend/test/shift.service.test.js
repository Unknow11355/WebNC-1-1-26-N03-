import test from 'node:test';
import assert from 'node:assert/strict';
import { createShiftService } from '../src/services/shift.service.js';
const auth = { role: 'employee', userId: 2 };
function setup(options = {}) {
  let current = options.current ?? null,
    locked = false;
  const repository = {
    employee: async (id, cx, lock) => {
      locked = !!lock;
      return { role_name: 'employee', status: options.inactive ? 'inactive' : 'active' };
    },
    current: async () => current,
    clock: async () => options.now || '2026-10-07 00:01:00',
    blocked: async () => !!options.blocked,
    start: async () => {
      assert.ok(locked);
      current = { shift_id: 1 };
      return 1;
    },
    end: async (id, now) => {
      assert.ok(locked);
      current = { ...current, status: 'completed', ended_at: now };
    },
    get: async () => current,
    history: async (id, range) => range,
  };
  return createShiftService({ repository, transactionManager: { run: (fn) => fn({}) } });
}
test('shift ownership and customer forbidden before mutation', async () => {
  for (const a of [
    { role: 'customer', userId: 2 },
    { role: 'employee', userId: 3 },
  ])
    await assert.rejects(setup().change(a, 2, 'start', {}), { status: 403 });
});
test('shift start locks employee and uses server clock', async () => {
  assert.equal((await setup().change(auth, 2, 'start', {})).shift_id, 1);
  await assert.rejects(setup().change(auth, 2, 'start', { employee_id: 3 }), { status: 400 });
});
test('shift rejects duplicate, leave and inactive employee', async () => {
  for (const o of [{ current: { shift_id: 1 } }, { blocked: true }, { inactive: true }])
    await assert.rejects(setup(o).change(auth, 2, 'start', {}), { status: 409 });
});
test('end overnight retains full closing date, including admin delegation', async () => {
  const s = setup({ current: { shift_id: 1, shift_date: '2026-10-06', start_time: '23:59:00' } });
  const result = await s.change({ role: 'admin', userId: 1 }, 2, 'end', { shift_id: 1 });
  assert.equal(result.ended_at, '2026-10-07 00:01:00');
});
test('stale end cannot close a newer shift or future shift', async () => {
  await assert.rejects(
    setup({ current: { shift_id: 2 } }).change(auth, 2, 'end', { shift_id: 1 }),
    { status: 409 },
  );
  await assert.rejects(
    setup({ current: { shift_id: 1, shift_date: '2026-10-08', start_time: '00:00:00' } }).change(
      auth,
      2,
      'end',
      { shift_id: 1 },
    ),
    { status: 409 },
  );
  await assert.rejects(setup().change(auth, 2, 'end', {}), { status: 400 });
});
test('history month and bounded pagination validated', async () => {
  assert.equal((await setup().history(auth, 2, { year: 2028, month: 2 })).count, 29);
  for (const q of [
    { year: 2026, month: 13 },
    { year: 2026, month: 1, limit: 21 },
    { year: 2026, month: 1, page: 0 },
  ])
    await assert.rejects(setup().history(auth, 2, q), { status: 400 });
});
