import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createProductRepository } from '../src/repositories/product.repository.js';
import { AppError } from '../src/errors/app-error.js';

async function withApi(t, repository) {
  const server = createApp({ productRepository: repository }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/v1`;
}

test('HTTP → controller → service → repository uses bound pagination and returns metadata', async (t) => {
  const calls = [];
  const db = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return sql.includes('COUNT(*)')
        ? [[{ total: 21 }]]
        : [[{ product_id: 21, product_name: 'Sữa' }]];
    },
  };
  const url = await withApi(t, createProductRepository(db));
  const response = await fetch(`${url}/products?page=2&limit=20`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.meta, { page: 2, limit: 20, total: 21, totalPages: 2 });
  assert.equal(result.data[0].product_name, 'Sữa');
  assert.deepEqual(calls[0].params, ['active', '20', '20']);
});

test('invalid pagination never reaches the data layer', async (t) => {
  const url = await withApi(t, {
    list() {
      assert.fail('Repository must not be called');
    },
  });
  for (const query of ['page=0', 'limit=21', 'page=1%20OR%201=1', 'page=1&page=2']) {
    const response = await fetch(`${url}/products?${query}`);
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.equal(result.error.traceId, response.headers.get('x-request-id'));
  }
});

test('health, missing routes and malformed JSON have predictable responses', async (t) => {
  const url = await withApi(t, {});
  assert.equal((await fetch(`${url}/health`)).status, 200);
  assert.equal((await fetch(`${url}/missing`)).status, 404);
  const response = await fetch(`${url}/products`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{broken',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
});

test('unexpected database errors do not expose SQL or stack traces', async (t) => {
  t.mock.method(console, 'error', () => {});
  const url = await withApi(t, {
    async list() {
      throw new Error('SELECT secret FROM users');
    },
  });
  const response = await fetch(`${url}/products`);
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.ok(!body.includes('SELECT'));
  assert.ok(!body.includes('stack'));
  assert.equal(JSON.parse(body).error.code, 'INTERNAL_ERROR');
});

test('report HTTP routes pass filters and activity employee ID through admin-only guards', async (t) => {
  const calls = [];
  const reportService = Object.fromEntries(
    ['revenue', 'products', 'employees', 'employeeActivity'].map((name) => [
      name,
      async (...args) => {
        calls.push([name, ...args]);
        return { data: { report: name }, meta: { filter: args.at(-1) } };
      },
    ]),
  );
  const requireAuth = (req, res, next) => {
    req.auth = {
      userId: 1,
      role: req.get('authorization') === 'Bearer admin' ? 'admin' : 'employee',
    };
    next();
  };
  const requireRole =
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.auth.role)
        ? next()
        : next(new AppError(403, 'FORBIDDEN', 'Chỉ admin được xem báo cáo'));
  const server = createApp({
    productRepository: { list: async () => ({ rows: [], total: 0 }) },
    reportService,
    requireAuth,
    requireRole,
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/reports`;
  const headers = { authorization: 'Bearer admin' };

  for (const path of ['/revenue', '/products', '/employees', '/employees/12/activity']) {
    const response = await fetch(`${base}${path}?from=2026-10-01&to=2026-10-02`, { headers });
    assert.equal(response.status, 200, path);
  }
  assert.equal(calls.length, 4);
  assert.equal(calls[3][0], 'employeeActivity');
  assert.deepEqual(calls[3][1], { userId: 1, role: 'admin' });
  assert.equal(calls[3][2], '12');
  assert.deepEqual({ ...calls[3][3] }, { from: '2026-10-01', to: '2026-10-02' });

  const denied = await fetch(`${base}/revenue?from=2026-10-01&to=2026-10-02`, {
    headers: { authorization: 'Bearer employee' },
  });
  assert.equal(denied.status, 403);
  assert.equal(calls.length, 4);
});
