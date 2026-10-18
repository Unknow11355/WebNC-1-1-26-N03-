import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/services/auth.service.js';
import { createAuthMiddleware } from '../src/middlewares/auth.middleware.js';
import { readSessionCookie, sessionCookieOptions } from '../src/middlewares/session-cookie.js';

test('BM7 HTTP cookie login, rotation, expiry, origin restrictions, logout and Bearer compatibility', async () => {
  const secret = 'isolated-cookie-test-secret-123456';
  const origin = 'https://demo-5173.app.github.dev';
  const sessions = new Map();
  const user = {
    user_id: 1,
    email: 'demo@example.test',
    status: 'active',
    role_name: 'customer',
    full_name: 'Demo',
  };
  const userRepository = {
    findByEmailForAuth: async () => user,
    findById: async () => user,
  };
  const sessionRepository = {
    async create({ jti, userId, expiresAt }) {
      sessions.set(jti, { user_id: userId, expires_at: expiresAt });
    },
    async findActiveById(jti) {
      return sessions.get(jti);
    },
    async revoke(jti) {
      sessions.delete(jti);
    },
  };
  const authService = createAuthService({
    userRepository,
    sessionRepository,
    jwtSecret: secret,
    verifyPassword: async (p) => p === 'correct',
  });
  const auth = createAuthMiddleware({ userRepository, sessionRepository, jwtSecret: secret });
  const server = createApp({
    productRepository: {},
    authService,
    ...auth,
    corsOrigins: [origin],
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/auth`;
  const login = (cookie, password = 'correct', cookieMode = true) =>
    fetch(`${url}/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
        ...(cookieMode ? { 'x-session-mode': 'cookie' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ email: user.email, password }),
    });
  try {
    const first = await login();
    assert.equal(first.status, 200);
    const header = first.headers.get('set-cookie');
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Max-Age=3600/);
    assert.match(header, /Path=\/api\/v1/);
    assert.doesNotMatch(header, /Domain=/);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.equal((await first.json()).data.access_token, undefined);
    const cookie1 = header.split(';')[0];
    const token1 = decodeURIComponent(cookie1.split('=')[1]);
    const claims = jwt.verify(token1, secret);
    assert.equal(claims.exp - claims.iat, 3600);
    assert.equal((await fetch(`${url}/me`, { headers: { cookie: cookie1 } })).status, 200);
    const wrong = await login(cookie1, 'wrong');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get('set-cookie'), null);
    assert.equal((await fetch(`${url}/me`, { headers: { cookie: cookie1 } })).status, 200);
    const second = await login(cookie1);
    const cookie2 = second.headers.get('set-cookie').split(';')[0];
    assert.notEqual(cookie1, cookie2);
    assert.equal((await fetch(`${url}/me`, { headers: { cookie: cookie1 } })).status, 401);
    assert.equal(
      (await fetch(`${url}/me`, { headers: { authorization: `Bearer ${token1}` } })).status,
      401,
    );
    for (const extra of [{}, { origin: 'https://demo-5500.app.github.dev' }, { origin: 'null' }]) {
      const blocked = await fetch(`${url}/logout`, {
        method: 'POST',
        headers: { cookie: cookie2, ...extra },
      });
      assert.equal(blocked.status, 403);
    }
    const logout = await fetch(`${url}/logout`, {
      method: 'POST',
      headers: { cookie: cookie2, origin },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await fetch(`${url}/me`, { headers: { cookie: cookie2 } })).status, 401);
    const expired = jwt.sign({ userId: 1 }, secret, { jwtid: 'expired', expiresIn: -1 });
    sessions.set('expired', { user_id: 1 });
    assert.equal(
      (await fetch(`${url}/me`, { headers: { cookie: `webnc_session=${expired}` } })).status,
      401,
    );
    const cli = await login(null, 'correct', false);
    const token = (await cli.json()).data.access_token;
    assert.ok(token);
    assert.equal(cli.headers.get('set-cookie'), null);
    assert.equal(
      (await fetch(`${url}/me`, { headers: { authorization: `Bearer ${token}` } })).status,
      200,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Secure is mandatory on Codespaces and production; local HTTP is documented exception', () => {
  const keys = ['CODESPACE_NAME', 'NODE_ENV', 'SESSION_COOKIE_SECURE'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    assert.equal(sessionCookieOptions().secure, false);
    process.env.CODESPACE_NAME = 'demo';
    process.env.SESSION_COOKIE_SECURE = 'false';
    assert.equal(sessionCookieOptions().secure, true);
    delete process.env.CODESPACE_NAME;
    process.env.NODE_ENV = 'production';
    assert.equal(sessionCookieOptions().secure, true);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('Cookie parsing rejects malformed or ambiguous cookie values', () => {
  for (const value of ['webnc_session=%ZZ', 'webnc_session=a; webnc_session=b', 'other=a']) {
    assert.equal(readSessionCookie({ get: () => value }), null);
  }
});
