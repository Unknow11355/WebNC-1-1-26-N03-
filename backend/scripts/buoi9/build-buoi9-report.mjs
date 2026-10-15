/* global console */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const beforePath = resolve('docs/buoi9/vinh/data/measure-before.json');
const afterPath = resolve('docs/buoi9/vinh/data/measure-after.json');
const cachePath = resolve('docs/buoi9/vinh/data/cache-check.json');
const outPath = resolve('docs/buoi9/vinh/hieu-nang.md');

const before = await readJson(beforePath);
const after = await readJson(afterPath);
let cacheCheck = null;
try {
  cacheCheck = JSON.parse(await readFile(cachePath, 'utf8'));
} catch {
  cacheCheck = null;
}

const names = Object.keys(before.summary);
const rows = names.map((name) => {
  const b = before.summary[name].median_ms;
  const a = after.summary[name].median_ms;
  const change = b === 0 ? 0 : ((b - a) / b) * 100;
  return {
    name,
    records: recordsFor(name, before),
    before: b,
    after: a,
    change,
  };
});

const cacheSamples = cacheCheck?.samples ?? [];
const cacheStatus = cacheSamples.map((row) => row.cache).filter(Boolean);
const cacheSummary = cacheSamples.length
  ? `- Kết quả header: ${[...new Set(cacheStatus)].join(', ') || 'không có header'}.
- Request đầu tiên: ${cacheSamples[0]?.cache ?? 'TODO'}
- Các request tiếp theo: ${cacheSamples.slice(1).map((row) => row.cache ?? 'TODO').join(', ') || 'TODO'}`
  : '- Chưa có file cache-check.json; chạy phase cache sau khi bật cache.';

const generatedAt = new Date().toISOString();
const md = `# Buổi 9 Vinh — Hiệu năng V2/V3

## Điều kiện đo

- Hai bộ 50 mẫu dùng cùng fixture và cùng query.
- Cache được **tắt ở cả BEFORE và AFTER** để so sánh index/query optimization công bằng.
- Mỗi API: 5 warm-up + 50 mẫu; concurrency = 1; localhost.
- Trung vị 50 mẫu = trung bình của mẫu thứ 25 và 26 sau khi sắp xếp tăng dần.
- API lỗi HTTP không được tính là mẫu thành công.
- Cache nóng/lạnh được đánh giá riêng trong \`cache-check.json\`.

## Bảng so sánh BEFORE/AFTER (cache đều tắt)

| API | Số bản ghi/nguồn | Median trước (ms) | Median sau (ms) | Thay đổi (%) | Ghi chú |
|---|---:|---:|---:|---:|---|
${rows.map((r) => `| ${r.name} | ${r.records} | ${r.before} | ${r.after} | ${r.change.toFixed(2)}% | Cùng payload/fixture. |`).join('\n')}

## Cache lạnh/nóng — /reports/products

${cacheSummary}

## Nguồn bằng chứng

- Before: \`docs/buoi9/vinh/data/measure-before.json\`
- After: \`docs/buoi9/vinh/data/measure-after.json\`
- CSV Before: \`docs/buoi9/vinh/data/measure-before.csv\`
- CSV After: \`docs/buoi9/vinh/data/measure-after.csv\`
- Cache: \`docs/buoi9/vinh/data/cache-check.json\`
- EXPLAIN trước: \`docs/buoi9/vinh/minh-chung/27-explain-before.txt\`
- EXPLAIN sau: \`docs/buoi9/vinh/minh-chung/28-explain-after.txt\`
- Ảnh bảng kết quả: \`docs/buoi9/vinh/minh-chung/29-ket-qua-do.png\`

Generated: ${generatedAt}
`;

function recordsFor(name, payload) {
  const f = payload.fixtures;
  if (name === 'products') return f.product_count;
  if (name === 'orders') return f.order_count;
  if (name === 'audit-logs') return f.audit_log_count;
  return `${f.order_count} orders / ${f.product_count} products`;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Chưa có đủ dữ liệu đo: ${path} (${error.message})`);
  }
}

await mkdir(resolve('docs/buoi9/vinh'), { recursive: true });
await writeFile(outPath, md, 'utf8');
console.log(`Đã tạo ${outPath}`);
