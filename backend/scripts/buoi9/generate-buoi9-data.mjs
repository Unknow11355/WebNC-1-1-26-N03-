/* global console, process */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const APPLY = process.argv.includes('--apply');
const CLEANUP = process.argv.includes('--cleanup');
const COUNT = intArg('--count=', 5000);
const ORDERS = intArg('--orders=', 5000);
const AUDIT = intArg('--audit=', 5000);
const SOURCE_DB = arg('--source-db=', process.env.DB_NAME || 'mini_supermarket');
const TARGET_DB = arg('--target-db=', 'mini_supermarket_buoi9_vinh');
const FROM = arg('--from=', process.env.B9_FROM || '2026-10-01');
const TO = arg('--to=', process.env.B9_TO || '2026-10-15');

if (!APPLY && !CLEANUP) {
  console.log('Chế độ an toàn: script chỉ xem hướng dẫn. Dùng --apply để tạo benchmark DB hoặc --cleanup để xóa riêng fixture B09.');
  process.exit(0);
}

const connectionConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

let conn;

function arg(prefix, fallback) {
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function intArg(prefix, fallback) {
  const value = Number(arg(prefix, String(fallback)));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${prefix} phải là số nguyên dương`);
  return value;
}

function qi(value) {
  return `\`${String(value).replaceAll('`', '``')}\``;
}

async function useTarget() {
  await conn.query(`USE ${qi(TARGET_DB)}`);
}

async function ensureTargetExists() {
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${qi(TARGET_DB)}
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

async function cloneTableStructures() {
  const [tables] = await conn.query(`SHOW FULL TABLES FROM ${qi(SOURCE_DB)} WHERE Table_type = 'BASE TABLE'`);
  const key = Object.keys(tables[0] ?? {})[0];
  if (!key) throw new Error(`Không tìm thấy bảng trong source DB ${SOURCE_DB}`);

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const row of tables) {
      const tableName = row[key];
      const [ddlRows] = await conn.query(`SHOW CREATE TABLE ${qi(SOURCE_DB)}.${qi(tableName)}`);
      const ddl = ddlRows[0]['Create Table'];
      const targetDdl = ddl.replace(
        new RegExp(`CREATE TABLE ${qi(tableName)}`),
        `CREATE TABLE IF NOT EXISTS ${qi(TARGET_DB)}.${qi(tableName)}`,
      );
      await conn.query(targetDdl);
    }
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function copyReferenceAccounts() {
  await conn.query(`INSERT IGNORE INTO ${qi(TARGET_DB)}.${qi('roles')}
    SELECT * FROM ${qi(SOURCE_DB)}.${qi('roles')}`);

  const emails = [
    'admin@mini.local',
    'employee@mini.local',
    'customer.a@mini.local',
    'customer.b@mini.local',
  ];

  for (const email of emails) {
    await conn.query(
      `INSERT IGNORE INTO ${qi(TARGET_DB)}.${qi('users')}
       SELECT * FROM ${qi(SOURCE_DB)}.${qi('users')}
       WHERE email = ?`,
      [email],
    );
  }
}

async function fixtureCount() {
  const [p] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${qi('products')} WHERE barcode LIKE 'B9-PERF-%'`,
  );
  const [o] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${qi('orders')} WHERE note LIKE 'B9_PERF_ORDER_%'`,
  );
  return { products: Number(p[0].total), orders: Number(o[0].total) };
}

async function cleanupFixtures() {
  await useTarget();
  const [orders] = await conn.query(
    `SELECT order_id FROM orders WHERE note LIKE 'B9_PERF_ORDER_%'`,
  );
  const orderIds = orders.map((row) => Number(row.order_id));

  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    await conn.query(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, orderIds);
    await conn.query(`DELETE FROM payments WHERE order_id IN (${placeholders})`, orderIds);
    await conn.query(`DELETE FROM loyalty_transactions WHERE order_id IN (${placeholders})`, orderIds);
    await conn.query(`DELETE FROM invoices WHERE order_id IN (${placeholders})`, orderIds);
    await conn.query(`DELETE FROM orders WHERE order_id IN (${placeholders})`, orderIds);
  }

  await conn.query(`DELETE FROM audit_logs WHERE request_id LIKE 'B9-PERF-AUDIT-%'`);
  await conn.query(`DELETE FROM products WHERE barcode LIKE 'B9-PERF-%'`);
  await conn.query(`DELETE FROM categories WHERE category_name = 'B9 Vinh Performance'`);

  console.log(`Đã cleanup riêng fixture B09 trong ${TARGET_DB}; không reset database.`);
}

async function seed() {
  await useTarget();

  const existing = await fixtureCount();
  if (existing.products || existing.orders) {
    throw new Error(
      `Target đã có fixture B09 (products=${existing.products}, orders=${existing.orders}). ` +
        `Để tạo lại sạch, chạy --cleanup trước rồi chạy --apply.`,
    );
  }

  const [catResult] = await conn.query(
    `INSERT INTO categories (category_name)
     VALUES ('B9 Vinh Performance')
     ON DUPLICATE KEY UPDATE category_id = LAST_INSERT_ID(category_id)`,
  );
  const categoryId = Number(catResult.insertId);

  const [users] = await conn.query(
    `SELECT u.user_id, u.email, r.role_name
     FROM users u JOIN roles r ON r.role_id = u.role_id
     WHERE u.email IN ('admin@mini.local','employee@mini.local','customer.a@mini.local','customer.b@mini.local')`,
  );
  const byEmail = Object.fromEntries(users.map((row) => [row.email, row]));
  if (!byEmail['admin@mini.local'] || !byEmail['employee@mini.local'] || !byEmail['customer.a@mini.local']) {
    throw new Error('Target DB thiếu tài khoản demo cần thiết; kiểm tra source DB hoặc seed tài khoản trước.');
  }

  const employeeId = Number(byEmail['employee@mini.local'].user_id);
  const customerA = Number(byEmail['customer.a@mini.local'].user_id);
  const customerB = Number(byEmail['customer.b@mini.local']?.user_id ?? customerA);

  console.log(`Target DB: ${TARGET_DB}`);
  console.log(`Category benchmark: ${categoryId}`);
  console.log(`Generating products=${COUNT}, orders=${ORDERS}, audit_logs=${AUDIT}`);

  const productBatch = 250;
  for (let start = 1; start <= COUNT; start += productBatch) {
    const end = Math.min(COUNT, start + productBatch - 1);
    const values = [];
    for (let n = start; n <= end; n++) {
      const price = 10_000 + (n % 40) * 2_500;
      const stock = n % 13 === 0 ? 0 : 10 + (n % 90);
      values.push([
        `B9 Performance Product ${String(n).padStart(5, '0')}`,
        `B9-PERF-${String(n).padStart(5, '0')}`,
        'Buoi 9 Vinh performance fixture',
        null,
        price,
        'sp',
        stock,
        5,
        categoryId,
        'active',
      ]);
    }
    await conn.query(
      `INSERT INTO products
       (product_name, barcode, description, image_url, price, unit, stock, min_stock, category_id, status)
       VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')}`,
      values.flat(),
    );
  }

  const [productRows] = await conn.query(
    `SELECT product_id, price
     FROM products
     WHERE barcode LIKE 'B9-PERF-%'
     ORDER BY product_id ASC`,
  );
  if (productRows.length < COUNT) throw new Error(`Không tạo đủ sản phẩm: ${productRows.length}/${COUNT}`);

  const orderBatch = 250;
  for (let start = 1; start <= ORDERS; start += orderBatch) {
    const end = Math.min(ORDERS, start + orderBatch - 1);
    const values = [];
    for (let n = start; n <= end; n++) {
      const p1 = productRows[(n * 7) % productRows.length];
      const p2 = productRows[(n * 17 + 31) % productRows.length];
      const quantity1 = 1 + (n % 3);
      const quantity2 = 1 + ((n + 1) % 2);
      const total = Number(p1.price) * quantity1 + Number(p2.price) * quantity2;
      const day = ((n - 1) % 15) + 1;
      const hour = n % 23;
      const minute = n % 60;
      const paidAt = `2026-10-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      const customerId = n % 2 === 0 ? customerA : customerB;
      values.push([
        customerId,
        employeeId,
        null,
        null,
        'online',
        'pickup',
        total.toFixed(2),
        '0.00',
        0,
        0,
        '0.00',
        total.toFixed(2),
        'cash',
        'completed',
        'paid',
        null,
        null,
        paidAt,
        'completed',
        null,
        null,
        null,
        `B9_PERF_ORDER_${String(n).padStart(5, '0')}`,
      ]);
    }
    await conn.query(
      `INSERT INTO orders
       (customer_id, employee_id, shift_id, voucher_id, order_type, delivery_method,
        total_amount, discount_amount, points_used, points_earned, points_discount,
        final_amount, payment_method, status, payment_status, transaction_id,
        transfer_content, paid_at, order_status, shipping_address, confirmed_by,
        confirmed_at, rejection_reason, note)
       VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
      values.flat(),
    );
  }

  const [orderRows] = await conn.query(
    `SELECT order_id, note, final_amount, paid_at
     FROM orders
     WHERE note LIKE 'B9_PERF_ORDER_%'
     ORDER BY order_id ASC`,
  );
  if (orderRows.length < ORDERS) throw new Error(`Không tạo đủ đơn: ${orderRows.length}/${ORDERS}`);

  const itemBatch = 250;
  for (let i = 0; i < orderRows.length; i += itemBatch) {
    const batch = orderRows.slice(i, i + itemBatch);
    const values = [];
    for (let j = 0; j < batch.length; j++) {
      const orderNo = i + j + 1;
      const p1 = productRows[(orderNo * 7) % productRows.length];
      const p2 = productRows[(orderNo * 17 + 31) % productRows.length];
      const q1 = 1 + (orderNo % 3);
      const q2 = 1 + ((orderNo + 1) % 2);
      values.push(
        [batch[j].order_id, p1.product_id, q1, Number(p1.price).toFixed(2), (Number(p1.price) * q1).toFixed(2)],
        [batch[j].order_id, p2.product_id, q2, Number(p2.price).toFixed(2), (Number(p2.price) * q2).toFixed(2)],
      );
    }
    await conn.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
       VALUES ${values.map(() => '(?,?,?,?,?)').join(',')}`,
      values.flat(),
    );
  }

  const payBatch = 500;
  for (let i = 0; i < orderRows.length; i += payBatch) {
    const batch = orderRows.slice(i, i + payBatch);
    const values = [];
    for (let j = 0; j < batch.length; j++) {
      const order = batch[j];
      const orderNo = i + j + 1;
      const tx = `B9-PERF-PAY-${String(orderNo).padStart(5, '0')}`;
      values.push([
        order.order_id,
        'cash',
        Number(order.final_amount).toFixed(2),
        'paid',
        tx,
        order.paid_at,
      ]);
    }
    await conn.query(
      `INSERT INTO payments (order_id, method, amount, status, transaction_id, paid_at)
       VALUES ${values.map(() => '(?,?,?,?,?,?)').join(',')}`,
      values.flat(),
    );
  }

  const auditBatch = 500;
  for (let start = 1; start <= AUDIT; start += auditBatch) {
    const end = Math.min(AUDIT, start + auditBatch - 1);
    const values = [];
    for (let n = start; n <= end; n++) {
      values.push([
        byEmail['admin@mini.local'].user_id,
        'LOGIN_SUCCESS',
        'user',
        byEmail['admin@mini.local'].user_id,
        'SUCCESS',
        `B9-PERF-AUDIT-${String(n).padStart(5, '0')}`,
        JSON.stringify({ fixture: 'buoi9_vinh', seq: n }),
      ]);
    }
    await conn.query(
      `INSERT INTO audit_logs
       (actor_id, action, entity_type, entity_id, outcome, request_id, metadata)
       VALUES ${values.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
      values.flat(),
    );
  }

  const fixture = {
    database: TARGET_DB,
    source_database: SOURCE_DB,
    category_id: categoryId,
    product_count: productRows.length,
    order_count: orderRows.length,
    audit_log_count: AUDIT,
    date_from: FROM,
    date_to: TO,
    generated_at: new Date().toISOString(),
    notes: 'Synthetic B09 fixture only; no group DB reset. Rebuild requires explicit --cleanup then --apply.',
  };

  const output = resolve('docs/buoi9/vinh/data/fixtures.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(fixture, null, 2) + '\n', 'utf8');

  console.log(`Đã ghi fixture metadata: ${output}`);
}

try {
  conn = await mysql.createConnection(connectionConfig);
  await ensureTargetExists();
  if (CLEANUP) {
    await cleanupFixtures();
  } else if (APPLY) {
    await cloneTableStructures();
    await copyReferenceAccounts();
    await seed();
  }
} finally {
  if (conn) await conn.end();
}
