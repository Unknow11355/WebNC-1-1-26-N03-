import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, redact, median } from './run.mjs';

test('HTML evidence cannot execute script', () => {
  assert.equal(escapeHtml('<script>"x"&</script>'), '&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;');
});
test('Redact credentials and nested personal data', () => {
  const result = redact({ data: { access_token: 'secret', user: { email: 'private', user_id: 2 }, items: [{ password_hash: 'hash' }] } });
  assert.equal(result.data.access_token, '[REDACTED]');
  assert.equal(result.data.user.email, '[REDACTED]');
  assert.equal(result.data.user.user_id, 2);
  assert.equal(result.data.items[0].password_hash, '[REDACTED]');
});
test('Median of even and odd samples, original array unchanged', () => {
  const a = [4, 1, 3, 2];
  assert.equal(median(a), 2.5);
  assert.equal(median([9, 1, 2]), 2);
  assert.deepEqual(a, [4, 1, 3, 2]);
  assert.throws(() => median([]));
});
