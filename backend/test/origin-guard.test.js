import test from 'node:test';
import assert from 'node:assert/strict';
import { createOriginGuard } from '../src/middlewares/origin-guard.js';
import { createApp } from '../src/app.js';

const trusted = 'https://demo-5173.app.github.dev';
const guard = createOriginGuard([trusted]);
test('HTTP app rejects foreign form and preflight before routes/CORS', async () => {
  const server = createApp({ productRepository: {}, corsOrigins: [trusted] }).listen(
    0,
    '127.0.0.1',
  );
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/auth/me`;
  try {
    for (const options of [
      {
        method: 'POST',
        headers: {
          origin: 'https://evil.test',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'address=CSRF_TEST',
      },
      {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.test', 'access-control-request-method': 'PATCH' },
      },
    ]) {
      const response = await fetch(url, options);
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, 'ORIGIN_FORBIDDEN');
    }
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: { origin: trusted, 'access-control-request-method': 'PATCH' },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), trusted);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
for (const [name, method, headers, status] of [
  ['trusted PATCH', 'PATCH', { origin: trusted }, undefined],
  ['trusted login', 'POST', { origin: trusted }, undefined],
  ['foreign form POST', 'POST', { origin: 'https://demo-5500.app.github.dev' }, 403],
  ['foreign PATCH', 'PATCH', { origin: 'https://evil.test' }, 403],
  [
    'foreign preflight',
    'OPTIONS',
    { origin: 'https://evil.test', 'access-control-request-method': 'PATCH' },
    403,
  ],
  [
    'trusted preflight',
    'OPTIONS',
    { origin: trusted, 'access-control-request-method': 'PATCH' },
    undefined,
  ],
  ['opaque origin', 'POST', { origin: 'null' }, 403],
  ['CLI without Origin', 'POST', {}, undefined],
  ['cross-site without Origin', 'POST', { 'sec-fetch-site': 'cross-site' }, 403],
  ['public GET', 'GET', { origin: 'https://evil.test' }, undefined],
  ['suffix spoof', 'POST', { origin: trusted + '.evil.test' }, 403],
]) {
  test(name, () => {
    let calls = 0;
    guard({ method, get: (key) => headers[key] }, {}, (error) => {
      calls++;
      assert.equal(error?.status, status);
      if (status) assert.equal(error.code, 'ORIGIN_FORBIDDEN');
    });
    assert.equal(calls, 1);
  });
}
