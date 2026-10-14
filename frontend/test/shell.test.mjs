import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
test('HTML keeps required application mount points and dialog controls', () => {
  for (const id of ['main', 'nav', 'identity', 'notice', 'dialog', 'dialog-title', 'dialog-content', 'close-dialog']) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, id);
  }
});
test('HTML respects CSP without inline scripts, styles or event handlers', () => {
  assert.doesNotMatch(html, /<style\b|\sstyle\s*=|\son\w+\s*=/i);
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    assert.match(script[1], /\bsrc=/);
    assert.equal(script[2].trim(), '');
  }
  assert.doesNotMatch(html, /via\.placeholder\.com|Đơn hàng #123|noti-badge/);
});
