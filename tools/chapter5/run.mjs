import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) =>
    [k, /token|password|secret|authorization|cookie|email|phone|address|full_name|comment|note|metadata/i.test(k) ? '[REDACTED]' : redact(v)]));
  return value;
}
export function median(samples) {
  if (!samples.length) throw new Error('Không có mẫu');
  const a = [...samples].sort((x, y) => x - y), n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const noLeak = r => assert(!/ER_PARSE_ERROR|sqlMessage|sqlState|SQL syntax|node_modules|\bat .*\.js:\d+/i.test(r.text), 'Lộ lỗi SQL/stack nội bộ');
const status = (r, expected) => assert(r.status === expected, `Mong đợi HTTP ${expected}, nhận ${r.status}`);
class Blocked extends Error {}

export async function run(config, outDir) {
  const base = new URL(config.baseUrl);
  assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search,
    'baseUrl phải là URL HTTP(S), không chứa tài khoản/query');
  const origin = base.href.replace(/\/$/, '');
  const rows = [], tokens = {}, users = {}, setup = [], measurements = [];
  const started = new Date().toISOString();
  let evidence = [];
  async function request(path, { role, method = 'GET', body, token, form, absolute = false } = {}) {
    if (role && !tokens[role]) throw new Blocked(`Thiếu phiên hợp lệ: ${role}`);
    const url = absolute ? path : origin + path;
    const headers = {};
    if (token || role) headers.Authorization = `Bearer ${token || tokens[role]}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const t = performance.now();
    const response = await fetch(url, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)),
      redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    const result = { status: response.status, json, text, ms: performance.now() - t, headers: response.headers };
    evidence.push({ method, url, role: role || (token ? 'token kiểm thử' : 'anonymous'), at: new Date().toISOString(),
      status: result.status, ms: Math.round(result.ms * 100) / 100,
      headers: Object.fromEntries(['content-type', 'content-security-policy', 'x-content-type-options', 'referrer-policy',
        'strict-transport-security', 'x-frame-options', 'permissions-policy'].map(k => [k, response.headers.get(k)])),
      response: json ? redact(json) : '[Không lưu nội dung không phải JSON]' });
    return result;
  }
  async function test(id, name, expected, fn) {
    evidence = [];
    let outcome = 'PASS', detail = '';
    try { await fn(); } catch (e) { outcome = e instanceof Blocked ? 'BLOCKED' : 'FAIL'; detail = e.message; }
    rows.push({ id, name, expected, outcome, detail, evidence: [...evidence] });
    console.log(`${id} ${outcome}: ${name}${detail ? ' — ' + detail : ''}`);
  }
  // Setup is recorded separately, never counted as security test successes.
  for (const role of ['admin', 'employee', 'customerA', 'customerB']) {
    evidence = [];
    const a = config.accounts?.[role];
    if (!a?.email || !a?.password) { setup.push({ role, outcome: 'BLOCKED', detail: 'Chưa cấu hình tài khoản' }); continue; }
    try {
      const r = await request('/auth/login', { method: 'POST', body: a });
      status(r, 200);
      assert(r.json?.data?.access_token, 'Không có access_token');
      tokens[role] = r.json.data.access_token;
      const me = await request('/auth/me', { role }); status(me, 200);
      const u = me.json?.data;
      assert((u?.role || u?.role_name) === (role.startsWith('customer') ? 'customer' : role), 'Sai vai trò tài khoản cấu hình');
      users[role] = u;
      setup.push({ role, outcome: 'PASS', evidence: [...evidence] });
    } catch (e) { delete tokens[role]; setup.push({ role, outcome: 'FAIL', detail: e.message, evidence: [...evidence] }); }
  }
  await test('AUTH01', 'Kho không token', '401; không có data', async () => {
    const r = await request('/inventory/items'); status(r, 401); assert(!r.json?.data, 'Lộ data'); noLeak(r);
  });
  await test('AUTH02', 'Khách hàng truy cập kho', '403; không có data', async () => {
    const r = await request('/inventory/items', { role: 'customerA' }); status(r, 403); assert(!r.json?.data, 'Lộ data');
  });
  await test('AUTH03', 'Nhân viên truy cập kho', '200; data là mảng', async () => {
    const r = await request('/inventory/items', { role: 'employee' }); status(r, 200); assert(Array.isArray(r.json?.data), 'Không có danh sách');
  });
  const dates = `?from=${encodeURIComponent(config.from)}&to=${encodeURIComponent(config.to)}`;
  for (const role of ['customerA', 'employee']) for (const path of ['/reports/revenue' + dates, '/audit-logs', '/auth/users']) {
    await test(`ROLE-${role}-${path.split('?')[0]}`, `${role} bị chặn ${path}`, '403', async () => {
      const r = await request(path, { role }); status(r, 403); assert(!r.json?.data, 'Lộ dữ liệu');
    });
  }
  for (const path of ['/products', '/categories', '/inventory/items']) {
    const role = path.startsWith('/inventory') ? 'employee' : undefined;
    await test('SQL-ID-' + path, 'Tiêm nhiễm ID ' + path, '400; không lộ SQL', async () => {
      const r = await request(path + '/' + encodeURIComponent("1' OR '1'='1"), { role }); status(r, 400); noLeak(r);
    });
  }
  for (const payload of ["'", "' OR '1'='1' --", "1' AND '1'='2"]) {
    await test('SQL-Q-' + (rows.length + 1), 'Tìm kiếm sản phẩm với chuỗi SQL', '400 hoặc 200 với mảng rỗng; không lộ SQL', async () => {
      const r = await request('/products?q=' + encodeURIComponent(payload)); noLeak(r);
      assert(r.status === 400 || (r.status === 200 && Array.isArray(r.json?.data) && r.json.data.length === 0), 'Không đúng kết quả từ chối/rỗng');
    });
  }
  for (const q of ['page=0', 'limit=21', 'limit=abc']) await test('INPUT-' + q, 'Phân trang ' + q, '400', async () => {
    const r = await request('/products?' + q); status(r, 400); noLeak(r);
  });
  await test('INPUT-LOGIN', 'Thiếu thông tin đăng nhập', '400', async () => {
    const r = await request('/auth/login', { method: 'POST', body: {} }); status(r, 400); noLeak(r);
  });
  await test('IDOR-CART', 'A sở hữu giỏ, B truy cập chéo', 'A:200 đúng chủ; B:403 không data', async () => {
    if (!users.customerA || !users.customerB) throw new Blocked('Cần hai khách hàng hợp lệ');
    assert(users.customerA.user_id !== users.customerB.user_id, 'A và B phải khác tài khoản');
    let r = await request('/carts', { role: 'customerA' }); status(r, 200);
    if (!r.json?.data?.cart_id && config.allowCreateCart) {
      r = await request('/carts', { role: 'customerA', method: 'POST', body: {} }); status(r, 201);
      r = await request('/carts', { role: 'customerA' }); status(r, 200);
    }
    const id = r.json?.data?.cart_id;
    if (!id) throw new Blocked('A chưa có giỏ; tạo bằng UI hoặc bật allowCreateCart');
    const own = await request('/carts/' + id, { role: 'customerA' }); status(own, 200);
    assert(Number(own.json?.data?.user_id) === Number(users.customerA.user_id), 'Không khớp chủ giỏ');
    const cross = await request('/carts/' + id, { role: 'customerB' }); status(cross, 403); assert(!cross.json?.data, 'Lộ giỏ A');
  });
  await test('IDOR-ORDER', 'B truy cập đơn của A', 'A:200 đúng chủ; B:403', async () => {
    if (!users.customerB || !users.customerA) throw new Blocked('Cần A và B');
    assert(users.customerA.user_id !== users.customerB.user_id, 'A và B trùng nhau');
    const list = await request('/orders/mine', { role: 'customerA' }); status(list, 200);
    const id = list.json?.data?.[0]?.order_id;
    if (!id) throw new Blocked('Tạo một đơn thử bằng khách A rồi chạy lại');
    const own = await request('/orders/' + id, { role: 'customerA' }); status(own, 200);
    assert(Number(own.json?.data?.customer_id) === Number(users.customerA.user_id), 'Không khớp chủ đơn');
    const cross = await request('/orders/' + id, { role: 'customerB' }); status(cross, 403); assert(!cross.json?.data, 'Lộ đơn A');
  });
  await test('UPLOAD-FAKE', 'Tệp văn bản giả đuôi PNG', '415; không tạo ảnh sử dụng được (cần kiểm tra dọn tệp riêng)', async () => {
    if (!config.allowUpload) throw new Blocked('Bật allowUpload trên DB thử nghiệm');
    const form = new FormData(); form.append('file', new Blob(['not an image'], { type: 'image/png' }), 'chapter5-fake.png');
    status(await request('/uploads/product-image', { role: 'admin', method: 'POST', form }), 415);
  });
  await test('UPLOAD-SIZE', 'Tệp lớn hơn 5 MiB', '413', async () => {
    if (!config.allowUpload) throw new Blocked('Chưa bật allowUpload');
    const form = new FormData(); form.append('file', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'chapter5-large.png');
    status(await request('/uploads/product-image', { role: 'admin', method: 'POST', form }), 413);
  });
  await test('RATE-LOGIN', 'Lần đăng nhập sai thứ 6 bị giới hạn', 'Lần 1-5:401; lần 6:429; nhật ký kiểm tra riêng', async () => {
    if (!config.allowRateTest || !config.rateAccount?.email) throw new Blocked('Cần bật allowRateTest và tài khoản thử riêng có thật');
    const a = config.rateAccount;
    for (let i = 1; i <= 6; i++) {
      const r = await request('/auth/login', { method: 'POST', body: { email: a.email, password: a.wrongPassword } });
      status(r, i === 6 ? 429 : 401);
    }
  });
  await test('ERROR', 'Lỗi đường dẫn không lộ nội bộ', '404 JSON, có traceId, không SQL/stack', async () => {
    const r = await request('/chapter5-does-not-exist'); status(r, 404); noLeak(r);
    assert(r.json?.error?.traceId, 'Thiếu traceId');
  });
  await test('HEADERS', 'Thu thập header URL web', '200; CSP, nosniff, Referrer-Policy (chưa thay đủ 5 header của thầy)', async () => {
    if (!config.webUrl) throw new Blocked('Thiếu webUrl');
    const r = await request(config.webUrl, { method: 'HEAD', absolute: true }); status(r, 200);
    assert(r.headers.get('content-security-policy'), 'Thiếu CSP');
    assert(r.headers.get('x-content-type-options') === 'nosniff', 'Thiếu nosniff');
    assert(r.headers.get('referrer-policy'), 'Thiếu Referrer-Policy');
  });
  if (config.benchmark) {
    for (const path of ['/products?page=1&limit=20', '/orders?status=completed&page=1&limit=20',
      '/reports/revenue' + dates, '/reports/products' + dates, '/audit-logs?page=1&limit=20']) {
      const samples = [];
      await test('PERF-' + path.split('?')[0], '50 mẫu: ' + path, '55 lần HTTP 200 (5 warm-up + 50 mẫu)', async () => {
        for (let i = 0; i < 55; i++) {
          const r = await request(path, { role: 'admin' }); status(r, 200);
          assert(r.json?.success === true, 'Không có phản hồi nghiệp vụ thành công');
          if (i >= 5) samples.push(r.ms);
        }
        measurements.push({ path, label: config.measurementLabel, samples, medianMs: median(samples), concurrency: 1, warmup: 5 });
      });
    }
  }
    await test('SESSION', 'Token không dùng được sau logout', 'me:200 → logout:204 → me:401', async () => {
    status(await request('/auth/me', { role: 'customerA' }), 200);
    status(await request('/auth/logout', { role: 'customerA', method: 'POST' }), 204);
    const r = await request('/auth/me', { role: 'customerA' });
    status(r, 401);
    assert(!r.json?.data, 'Lộ hồ sơ');
  });  // Best effort: revoke only sessions issued by this runner, never pre-existing sessions.
  for (const role of Object.keys(tokens)) {
    try { await request('/auth/logout', { role, method: 'POST' }); } catch { /* documented below */ }
  }
  const report = { scope: 'Kiểm thử API Chương 5; KHÔNG phải toàn bộ 25 ca nghiệp vụ hoặc chứng nhận BM1–BM12/WCAG',
    started, finished: new Date().toISOString(), baseUrl: origin, environment: config.environment,
    revision: config.revision, conditions: config.conditions, runtime: process.version, setup, rows, measurements,
    notes: ['Tài khoản/giỏ/đơn có sẵn không bị xóa. Giỏ tạo bởi tùy chọn allowCreateCart được giữ lại.',
      'Nếu API upload có lỗi, tệp thử có thể còn lại; kiểm tra thư mục uploads theo thời điểm chạy.',
      'Logout dọn phiên là best effort; kiểm tra user_sessions nếu cần.',
      'Kiểm thử SQL chỉ bao phủ các đường dẫn ghi trong báo cáo; chưa phải mọi trường tìm kiếm.',
      'Không dùng kết quả helper tự kiểm tra như bằng chứng ứng dụng đã đạt.'] };
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
  const summary = rows.reduce((a, r) => ({ ...a, [r.outcome]: (a[r.outcome] || 0) + 1 }), {});
  const e = escapeHtml;
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kiểm thử Chương 5</title>
    <style>body{font:16px Arial;margin:32px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:8px;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f8;padding:12px}.FAIL{color:#b00020}.PASS{color:#086526}.BLOCKED{color:#865600}</style>
    <h1>Báo cáo kiểm thử API — Chương 5</h1><p>${e(report.scope)}</p>
    <p>URL: ${e(origin)}<br>Môi trường: ${e(config.environment)}<br>Commit: ${e(config.revision)}<br>Thời gian UTC: ${e(started)}<br>${e(JSON.stringify(summary))}</p>
    <h2>Chuẩn bị tài khoản</h2><pre>${e(JSON.stringify(setup, null, 2))}</pre>
    <table><tr><th>Mã</th><th>Kịch bản</th><th>Mong đợi</th><th>Kết quả</th></tr>${rows.map(r => `<tr><td>${e(r.id)}</td><td>${e(r.name)}</td><td>${e(r.expected)}</td><td class="${r.outcome}">${e(r.outcome)} ${e(r.detail)}</td></tr>`).join('')}</table>
    <h2>Bằng chứng từng ca (đã che dữ liệu nhạy cảm)</h2>${rows.map(r => `<details open><summary>${e(r.id)} — ${e(r.outcome)}</summary><pre>${e(JSON.stringify(r.evidence, null, 2))}</pre></details>`).join('')}
    <h2>Đo hiệu năng</h2><pre>${e(JSON.stringify(measurements, null, 2))}</pre><h2>Giới hạn</h2><pre>${e(report.notes.join('\n'))}</pre></html>`;
  await writeFile(resolve(outDir, 'report.html'), html);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = dirname(fileURLToPath(import.meta.url));
    const config = JSON.parse(await readFile(resolve(process.argv[2] || resolve(root, 'config.local.json')), 'utf8'));
    const output = resolve(root, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
    const report = await run(config, output);
    console.log('Báo cáo: ' + resolve(output, 'report.html'));
    process.exitCode = report.rows.some(r => r.outcome !== 'PASS') || report.setup.some(r => r.outcome !== 'PASS') ? 1 : 0;
  } catch (e) { console.error('Không chạy được: ' + e.message); process.exitCode = 2; }
}
