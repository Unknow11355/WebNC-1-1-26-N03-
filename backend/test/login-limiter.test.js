import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoginLimiter } from '../src/services/login-limiter.js';
const wrong = async () => {
  throw Object.assign(new Error('wrong'), { status: 401 });
};
test('five failures then 429, audit event, expiry and account isolation', async () => {
  let time = 0;
  const events = [];
  const limiter = createLoginLimiter({ now: () => time, onLimited: async (id) => events.push(id) });
  for (let i = 0; i < 5; i++) await assert.rejects(limiter.run('a', wrong), { status: 401 });
  await assert.rejects(
    limiter.run('a', async () => true, 'trace-6'),
    { status: 429 },
  );
  assert.deepEqual(events, ['trace-6']);
  assert.equal(await limiter.run('b', async () => true), true);
  time = 900000;
  assert.equal(await limiter.run('a', async () => true), true);
});
test('successful requests and internal errors do not consume failure budget', async () => {
  const limiter = createLoginLimiter();
  for (let i = 0; i < 8; i++) {
    await limiter.run('a', async () => true);
    await assert.rejects(
      limiter.run('a', async () => {
        throw new Error('DB unavailable');
      }),
    );
  }
  await assert.rejects(limiter.run('a', wrong), { status: 401 });
});
test('parallel guesses reserve slots before asynchronous verification', async () => {
  const limiter = createLoginLimiter();
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => limiter.run('a', wrong)),
  );
  assert.equal(results.filter((r) => r.reason?.status === 401).length, 5);
  assert.equal(results.filter((r) => r.reason?.status === 429).length, 15);
});
