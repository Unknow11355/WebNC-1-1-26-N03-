import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicOrigin, renderSeo } from '../seo.mjs';

test('SEO origin uses explicit configuration or the current Codespace', () => {
  assert.equal(publicOrigin({ PUBLIC_ORIGIN: 'https://example.com/' }), 'https://example.com');
  assert.equal(publicOrigin({ CODESPACE_NAME: 'demo' }), 'https://demo-5173.app.github.dev');
  assert.equal(publicOrigin({}), 'http://localhost:5173');
  for (const value of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/private', 'https://example.com/#pos']) {
    assert.throws(() => publicOrigin({ PUBLIC_ORIGIN: value }));
  }
});

test('SEO templates expose only public root and an absolute sitemap URL', async () => {
  const origin = 'https://demo-5173.app.github.dev';
  const robots = renderSeo(await readFile(new URL('../robots.txt', import.meta.url), 'utf8'), origin);
  const sitemap = renderSeo(await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8'), origin);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
  assert.ok(sitemap.includes(`<loc>${origin}/</loc>`));
  assert.doesNotMatch(sitemap, /#|localhost|\{\{/);
});
