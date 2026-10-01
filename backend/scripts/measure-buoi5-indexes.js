import 'dotenv/config';
import mysql from 'mysql2/promise';
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const db = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mini_supermarket',
  waitForConnections: true,
  connectionLimit: 4,
});

const RUNS = Number(process.env.B5_BENCH_RUNS ?? 31);
const WARMUP = Number(process.env.B5_BENCH_WARMUP ?? 5);
if (!Number.isInteger(RUNS) || RUNS < 5) throw new Error('B5_BENCH_RUNS phải là số nguyên >= 5');
if (!Number.isInteger(WARMUP) || WARMUP < 0) throw new Error('B5_BENCH_WARMUP phải là số nguyên >= 0');

async function buildQueries() {
  const [[category]] = await db.execute(`SELECT MIN(category_id) AS id FROM categories`);
  const [[inventoryItem]] = await db.execute(`SELECT MIN(inventory_item_id) AS id FROM inventory_items`);
  const [[customer]] = await db.execute(`SELECT MIN(user_id) AS id FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name='customer')`);
  if (!category?.id || !inventoryItem?.id || !customer?.id) throw new Error('Thiếu dữ liệu seed để đo index');
  return [
    {
      name: 'products_by_status_category',
      condition: 'status=active AND category_id=<seed category>, ORDER BY product_id ASC',
      sql: `SELECT p.product_id, p.product_name, p.barcode, p.price, p.unit, p.stock, p.category_id
            FROM products p
            WHERE p.status = ? AND p.category_id = ?
            ORDER BY p.product_id ASC LIMIT ? OFFSET ?`,
      params: ['active', Number(category.id), 20, 0],
    },
    {
      name: 'inventory_logs_by_item',
      condition: 'inventory_item_id=<seed item>, ORDER BY created_at DESC, log_id DESC',
      sql: `SELECT log_id, inventory_item_id, product_id, employee_id, action, quantity, created_at
            FROM inventory_logs
            WHERE inventory_item_id = ?
            ORDER BY created_at DESC, log_id DESC LIMIT ? OFFSET ?`,
      params: [Number(inventoryItem.id), 20, 0],
    },
    {
      name: 'orders_by_customer',
      condition: 'customer_id=<seed customer>, ORDER BY created_at DESC, order_id DESC',
      sql: `SELECT order_id, customer_id, delivery_method, final_amount, status, payment_status, created_at
            FROM orders
            WHERE customer_id = ?
            ORDER BY created_at DESC, order_id DESC LIMIT ? OFFSET ?`,
      params: [Number(customer.id), 20, 0],
    },
    {
      name: 'orders_by_status',
      condition: 'status=pending, ORDER BY created_at DESC, order_id DESC',
      sql: `SELECT order_id, customer_id, delivery_method, final_amount, status, payment_status, created_at
            FROM orders
            WHERE status = ?
            ORDER BY created_at DESC, order_id DESC LIMIT ? OFFSET ?`,
      params: ['pending', 20, 0],
    },
  ];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function explain(sql, params) {
  const [rows] = await db.execute(`EXPLAIN ${sql}`, params);
  return rows.map((row) => ({ table: row.table, key: row.key, rows: row.rows, type: row.type }));
}

async function main() {
  console.log(`# Buoi 5 index measurement`);
  console.log(`runs=${RUNS}, warmup=${WARMUP}`);
  const queries = await buildQueries();
  const report = [];
  for (const q of queries) {
    for (let i = 0; i < WARMUP; i += 1) await db.execute(q.sql, q.params);
    const timings = [];
    for (let i = 0; i < RUNS; i += 1) {
      const start = performance.now();
      await db.execute(q.sql, q.params);
      timings.push(performance.now() - start);
    }
    const plan = await explain(q.sql, q.params);
    const row = { name: q.name, condition: q.condition, sql: q.sql.replace(/\s+/g, ' ').trim(), params: q.params, runs: RUNS, warmup: WARMUP, median_ms: Number(median(timings).toFixed(3)), explain: plan };
    report.push(row);
    console.log(JSON.stringify(row));
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(here, '../../docs/buoi5-index-measurement.latest.json');
  await writeFile(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), database: process.env.DB_NAME ?? 'mini_supermarket', report }, null, 2));
  console.log(`saved=${outputPath}`);
}

main().catch((error) => {
  console.error(`benchmark failed: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await db.end();
});
