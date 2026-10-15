/* global console, process */

import 'dotenv/config';
import axios from 'axios';
import mysql from 'mysql2/promise';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';

const cacheCheck = process.argv.includes('--cache-check');
const phase = getArg('--phase=', cacheCheck ? 'cache' : 'before');
if (!['before', 'after', 'cache'].includes(phase)) {
  throw new Error('--phase phải là before, after hoặc cache');
}

const baseUrl = process.env.B9_BASE_URL || 'http://localhost:3000/api/v1';
const fixturePath = resolve(process.env.B9_FIXTURE_FILE || 'docs/buoi9/vinh/data/fixtures.json');
const sampleCount = positiveInt(process.env.B9_SAMPLES || '50', 'B9_SAMPLES');
const warmupCount = positiveInt(process.env.B9_WARMUP || '5', 'B9_WARMUP');

const rawDir = resolve('docs/buoi9/vinh/data');
const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'));
const token = await resolveToken();
const metadata = await runtimeMetadata();

const apiList = [
  {
    name: 'products',
    method: 'GET',
    path: '/products',
    query: {
      category_id: fixtures.category_id,
      min_price: 10000,
      max_price: 80000,
      in_stock: 'true',
      sort: 'price',
      order: 'asc',
      page: 1,
      limit: 20,
    },
  },
  {
    name: 'orders',
    method: 'GET',
    path: '/orders',
    query: { status: 'completed', page: 1, limit: 20 },
  },
  {
    name: 'reports-revenue',
    method: 'GET',
    path: '/reports/revenue',
    query: { from: fixtures.date_from, to: fixtures.date_to },
  },
  {
    name: 'reports-products',
    method: 'GET',
    path: '/reports/products',
    query: { from: fixtures.date_from, to: fixtures.date_to },
  },
  {
    name: 'audit-logs',
    method: 'GET',
    path: '/audit-logs',
    query: { action: 'LOGIN_SUCCESS', page: 1, limit: 20 },
  },
];

async function resolveToken() {
  if (process.env.B9_TOKEN) return process.env.B9_TOKEN;
  const email = process.env.B9_ADMIN_EMAIL;
  const password = process.env.B9_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Thiếu B9_TOKEN hoặc B9_ADMIN_EMAIL + B9_ADMIN_PASSWORD. Không ghi credential vào Git.',
    );
  }

  const response = await axios.post(
    `${baseUrl}/auth/login`,
    { email, password },
    { timeout: 15000 },
  );
  if (response.status < 200 || response.status >= 300 || !response.data?.data?.access_token) {
    throw new Error(`Đăng nhập benchmark thất bại: HTTP ${response.status}`);
  }
  return response.data.data.access_token;
}

function getArg(prefix, fallback) {
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function positiveInt(raw, field) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${field} phải là số nguyên dương`);
  return value;
}

async function runtimeMetadata() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.B9_DB_NAME || fixtures.database,
  });
  try {
    const [rows] = await db.query('SELECT VERSION() AS version');
    return {
      node: process.version,
      mysql: rows[0]?.version ?? 'unknown',
      base_url: baseUrl,
      phase,
      cache_mode: phase === 'cache' ? 'enabled' : 'disabled-for-comparison',
      sample_count: phase === 'cache' ? null : sampleCount,
      warmup_count: warmupCount,
      concurrency: 1,
      timing: 'Sequential requests; performance.now() measured around full HTTP request.',
      network: 'Local backend over localhost; no remote network.',
      median_formula: '50 samples: (sorted[24] + sorted[25]) / 2.',
      database: process.env.B9_DB_NAME || fixtures.database,
      fixture: fixturePath,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await db.end();
  }
}

async function requestApi(api) {
  const started = performance.now();
  try {
    const response = await axios({
      method: api.method,
      url: `${baseUrl}${api.path}`,
      params: api.query,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30_000,
      validateStatus: () => true,
    });
    const elapsed = Number((performance.now() - started).toFixed(3));
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} (expected 2xx)`);
    }
    return {
      latency_ms: elapsed,
      status: response.status,
      response_bytes: Buffer.byteLength(JSON.stringify(response.data ?? null), 'utf8'),
      cache: response.headers['x-report-cache'] ?? null,
      ok: true,
    };
  } catch (error) {
    const elapsed = Number((performance.now() - started).toFixed(3));
    return {
      latency_ms: elapsed,
      status: error?.response?.status ?? 0,
      response_bytes: 0,
      cache: error?.response?.headers?.['x-report-cache'] ?? null,
      ok: false,
      error: error.message,
    };
  }
}

async function warm(api, count = warmupCount) {
  const samples = [];
  for (let i = 0; i < count; i++) samples.push(await requestApi(api));
  return samples;
}

async function measure(api) {
  const warmup = await warm(api);
  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    const result = await requestApi(api);
    samples.push({ n: i + 1, ...result });
    if (!result.ok) throw new Error(`${api.name}: sample ${i + 1} thất bại: ${result.error}`);
  }
  return { warmup, samples };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length !== 50)
    throw new Error(`Cần đúng 50 mẫu để tính trung vị; nhận ${sorted.length}`);
  return (sorted[24] + sorted[25]) / 2;
}

if (phase === 'cache') {
  const api = apiList.find((item) => item.name === 'reports-products');
  console.log('Kiểm tra cache lạnh/nóng cho reports-products...');
  const samples = await warm(api, Math.max(5, warmupCount));
  const payload = {
    metadata,
    fixtures,
    api,
    first_request_should_be: 'MISS',
   following_requests_should_be: 'HIT',
    samples,
  };
  const out = resolve(`${rawDir}/cache-check.json`);
  await mkdir(rawDir, { recursive: true });
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Đã lưu cache check: ${out}`);
} else {
  const results = {};
  for (const api of apiList) {
    console.log(`Đo ${api.name}: warmup=${warmupCount}, samples=${sampleCount}`);
    results[api.name] = await measure(api);
  }

  const summary = {};
  for (const api of apiList) {
    const samples = results[api.name].samples.map((row) => row.latency_ms);
    const cacheValues = results[api.name].samples.map((row) => row.cache).filter(Boolean);
    summary[api.name] = {
      method: api.method,
      path: api.path,
      query: api.query,
      sample_count: samples.length,
      median_ms: Number(median(samples).toFixed(3)),
      min_ms: Number(Math.min(...samples).toFixed(3)),
      max_ms: Number(Math.max(...samples).toFixed(3)),
      cache_headers: cacheValues.length ? [...new Set(cacheValues)] : [],
    };
  }

  const payload = { metadata, fixtures, apis: apiList, summary, raw: results };
  await mkdir(rawDir, { recursive: true });
  const jsonOut = resolve(`${rawDir}/measure-${phase}.json`);
  const csvOut = resolve(`${rawDir}/measure-${phase}.csv`);
  await writeFile(jsonOut, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const lines = ['phase,api,sample,latency_ms,status,cache,ok,response_bytes'];
  for (const api of apiList) {
    for (const row of results[api.name].samples) {
      lines.push([
        phase,
        api.name,
        row.n,
        row.latency_ms,
        row.status,
        row.cache ?? '',
        row.ok,
        row.response_bytes,
      ].join(','));
    }
  }
  await writeFile(csvOut, lines.join('\n') + '\n', 'utf8');

  console.log(`Đã lưu raw JSON: ${jsonOut}`);
  console.log(`Đã lưu CSV: ${csvOut}`);
}
