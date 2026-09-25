import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { AppError } from '../src/errors/app-error.js';
import { errorHandler } from '../src/middlewares/error-handler.js';

async function start(t, failure) {
  const logs = [];
  t.mock.method(console, 'warn', (value) => logs.push(value));
  t.mock.method(console, 'error', (value) => logs.push(value));
  const app = createApp({
    productRepository: {
      async list() {
        throw failure;
      },
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { url: `http://127.0.0.1:${server.address().port}/api/v1`, logs };
}

async function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, code);
  assert.equal(body.error.traceId, response.headers.get('x-request-id'));
  assert.ok(Number.isFinite(Date.parse(body.error.timestamp)));
  assert.ok(Array.isArray(body.error.details));
  return body.error;
}

test('business errors preserve details and correlate with server logs', async (t) => {
  const details = [{ field: 'quantity', issue: 'Số lượng vượt tồn kho' }];
  const { url, logs } = await start(
    t,
    new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Không đủ hàng', details),
  );
  const error = await expectError(await fetch(`${url}/products`), 422, 'BUSINESS_RULE_VIOLATION');
  assert.deepEqual(error.details, details);
  assert.equal(error.path, '/api/v1/products');
  assert.equal(JSON.parse(logs[0]).traceId, error.traceId);
});

test('database and unexpected errors do not leak secrets in response or logs', async (t) => {
  const cases = [
    [
      Object.assign(new Error('SELECT secret_password FROM users'), { code: 'ER_DUP_ENTRY' }),
      409,
      'CONFLICT',
    ],
    [
      Object.assign(new Error('secret_password'), { code: 'ER_ROW_IS_REFERENCED_2' }),
      409,
      'CONFLICT',
    ],
    [
      Object.assign(new Error('secret_password'), { code: 'ER_NO_REFERENCED_ROW_2' }),
      409,
      'CONFLICT',
    ],
    [Object.assign(new Error('secret_password'), { status: 400 }), 500, 'INTERNAL_ERROR'],
    [new AppError(503, 'DATABASE_DOWN', 'secret_password'), 500, 'INTERNAL_ERROR'],
    [null, 500, 'INTERNAL_ERROR'],
  ];
  for (const [failure, status, code] of cases) {
    await t.test(code + ':' + status, async (t) => {
      const { url, logs } = await start(t, failure);
      const error = await expectError(
        await fetch(`${url}/products?token=secret_password`),
        status,
        code,
      );
      assert.ok(!JSON.stringify({ error, logs }).includes('secret_password'));
      assert.ok(!JSON.stringify(error).includes('SELECT'));
    });
  }
});

test('parser errors and missing routes use the same envelope', async (t) => {
  const { url } = await start(t, new Error('Repository must not be reached'));
  await expectError(await fetch(`${url}/missing`), 404, 'NOT_FOUND');
  await expectError(
    await fetch(`${url}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }),
    400,
    'VALIDATION_ERROR',
  );
  await expectError(
    await fetch(`${url}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(1024 * 1024) }),
    }),
    413,
    'PAYLOAD_TOO_LARGE',
  );
  await expectError(
    await fetch(`${url}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=invalid' },
      body: '{}',
    }),
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  );
});

test('trace IDs are unique and not supplied by the caller', async (t) => {
  const { url } = await start(t, new AppError(403, 'FORBIDDEN', 'Không có quyền'));
  const first = await expectError(
    await fetch(`${url}/products`, {
      headers: { 'X-Request-Id': 'client-supplied' },
    }),
    403,
    'FORBIDDEN',
  );
  const second = await expectError(await fetch(`${url}/products`), 403, 'FORBIDDEN');
  assert.notEqual(first.traceId, 'client-supplied');
  assert.notEqual(first.traceId, second.traceId);
});

test('handler delegates after response headers were sent', () => {
  const failure = new Error('stream interrupted');
  let delegated;
  errorHandler(failure, {}, { headersSent: true }, (error) => {
    delegated = error;
  });
  assert.equal(delegated, failure);
});
