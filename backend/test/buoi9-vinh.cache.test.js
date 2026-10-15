import test from 'node:test';
import assert from 'node:assert/strict';
import { clearReportCache, invalidateReportCache } from '../src/cache/report-cache.js';
import { createReportService, REPORT_CACHE_STATUS } from '../src/services/report.service.js';

test('report products cache is isolated by user and invalidatable', async () => {
  process.env.B9_REPORT_CACHE = '1';
  process.env.B9_REPORT_CACHE_TTL_MS = '60000';
  clearReportCache();

  let calls = 0;
  const repository = {
    async products() {
      calls += 1;
      return [{ product_id: calls }];
    },
    async revenue() {
      return {};
    },
    async employees() {
      return [];
    },
  };

  const service = createReportService(repository);
  const query = { from: '2026-10-01', to: '2026-10-15' };

  const first = await service.products({ userId: 1, role: 'admin' }, query);
  const second = await service.products({ userId: 1, role: 'admin' }, query);
  const otherUser = await service.products({ userId: 2, role: 'admin' }, query);

  assert.equal(first[REPORT_CACHE_STATUS], 'MISS');
  assert.equal(second[REPORT_CACHE_STATUS], 'HIT');
  assert.equal(otherUser[REPORT_CACHE_STATUS], 'MISS');
  assert.equal(calls, 2);

  invalidateReportCache();

  const afterInvalidate = await service.products({ userId: 1, role: 'admin' }, query);
  assert.equal(afterInvalidate[REPORT_CACHE_STATUS], 'MISS');
  assert.equal(calls, 3);
});
