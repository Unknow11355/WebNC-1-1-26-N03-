import test from 'node:test';
import assert from 'node:assert/strict';
import { createBarcodeService } from '../src/services/barcode.service.js';
import { createScheduleService, monthRange } from '../src/services/schedule.service.js';

test('barcode scans shelf first, then warehouse; check includes inactive', async () => {
  const modes = [];
  const service = createBarcodeService({
    product: async (code, active = true) => {
      modes.push(active);
      return code === 'BOTH' ? { product_id: 1 } : null;
    },
    inventory: async () => ({ inventory_item_id: 2 }),
  });
  assert.equal((await service.scan('BOTH')).type, 'product');
  assert.equal((await service.scan('WAREHOUSE')).type, 'inventory_item');
  assert.equal((await service.check('BOTH')).exists, true);
  assert.ok(modes.includes(false));
});
test('barcode rejects empty/oversized codes and missing records', async () => {
  const s = createBarcodeService({ product: async () => null, inventory: async () => null });
  for (const code of ['', 'x'.repeat(51), '\u0000', null])
    await assert.rejects(s.scan(code), { status: 400 });
  await assert.rejects(s.scan('UNKNOWN'), { status: 404 });
});
test('generated code checks both tables and reports not reserved', async () => {
  let count = 0;
  const s = createBarcodeService(
    { product: async (code) => (code === 'SPOLD' ? {} : null), inventory: async () => null },
    () => (++count === 1 ? 'OLD' : 'NEW'),
  );
  assert.deepEqual(await s.generate({ prefix: 'sp' }), { code: 'SPNEW', reserved: false });
});
test('generation collision limit is bounded', async () => {
  const s = createBarcodeService(
    { product: async () => ({}), inventory: async () => null },
    () => 'DUP',
  );
  await assert.rejects(s.generate(), { status: 409 });
});
function fixture(type = 'full_time') {
  const calls = [];
  const repository = {
    employee: async () => ({
      user_id: 2,
      full_name: 'Nhân viên',
      employment_type: type,
      status: 'active',
    }),
    overview: async () => [],
    days: async () => ({
      overrides: [{ work_date: '2028-02-10', day_status: 'sick', note: 'Nghỉ' }],
      shifts: [{ shift_date: '2028-02-01' }, { shift_date: '2028-02-01' }],
    }),
    setDay: async (...args) => calls.push(args),
  };
  return { calls, service: createScheduleService(repository) };
}
test('schedule leap month and unique worked days preserve defaults', async () => {
  const f = fixture();
  const data = await f.service.month({ userId: 2, role: 'employee' }, 2, { year: 2028, month: 2 });
  assert.equal(data.days.length, 29);
  assert.equal(data.summary.worked_days, 1);
  assert.equal(data.days[9].schedule_allows_work, false);
  assert.equal(data.days[0].default_status, 'scheduled');
  const part = await fixture('part_time').service.month({ userId: 1, role: 'admin' }, 2, {
    year: 2028,
    month: 2,
  });
  assert.equal(part.days[0].default_status, 'flexible');
});
test('schedule denies cross-employee, customer, and employee write', async () => {
  const f = fixture();
  for (const auth of [
    { userId: 3, role: 'employee' },
    { userId: 2, role: 'customer' },
  ])
    await assert.rejects(f.service.month(auth, 2, { year: 2028, month: 2 }), { status: 403 });
  await assert.rejects(f.service.setDay({ userId: 2, role: 'employee' }, 2, {}), { status: 403 });
  assert.equal(f.calls.length, 0);
});
test('schedule validates date/status/note and supports restoring default', async () => {
  const f = fixture(),
    auth = { userId: 1, role: 'admin' };
  for (const input of [
    { work_date: '2027-02-29', day_status: 'leave' },
    { work_date: '2028-02-00', day_status: 'leave' },
    { work_date: '2028-02-12', day_status: 'unknown' },
    { work_date: '2028-02-12', day_status: 'sick', note: 'x'.repeat(256) },
    { work_date: '2028-02-12', day_status: 'sick', set_by: 9 },
  ])
    await assert.rejects(f.service.setDay(auth, 2, input), { status: 400 });
  await f.service.setDay(auth, 2, { work_date: '2028-02-29', day_status: 'scheduled' });
  assert.deepEqual(f.calls[0], [2, '2028-02-29', 'clear', null, 1]);
  assert.throws(() => monthRange({ year: 2028, month: 13 }), { status: 400 });
});
