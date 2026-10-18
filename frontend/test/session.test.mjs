import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Browser clients use same-origin cookies, not storage tokens or Bearer headers', async () => {
  for (const file of ['app.js', 'reports.js', 'audit.js', 'upload.js']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:sessionStorage|localStorage)\.(?:getItem|setItem)\(["']token["']/);
    assert.doesNotMatch(source, /Bearer|state\.token/);
    assert.match(source, /credentials:\s*["']same-origin["']/);
  }
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /"X-Session-Mode": "cookie"/);
  assert.match(app, /sessionStorage\.removeItem\("token"\)/);
  assert.match(app, /localStorage\.removeItem\("token"\)/);
});
