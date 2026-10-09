// Isolated local demo. Leaves its named demo database intact on exit so edits are not lost.
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const database = `linh_phone_demo_${randomBytes(6).toString('hex')}`;
const config = {
  host: process.env.TEST_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT ?? 3306),
  user: process.env.TEST_DB_USER ?? 'root',
  password: process.env.TEST_DB_PASSWORD ?? '',
};
const db = await mysql.createConnection({ ...config, multipleStatements: true });
try {
  await db.query(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  for (const file of [
    '01_schema.sql',
    '03_buoi4_auth_schema.sql',
    '05_buoi5_migration.sql',
    '10_buoi6_migration.sql',
  ]) {
    const sql = (
      await readFile(new URL(`../../database/${file}`, import.meta.url), 'utf8')
    ).replaceAll('mini_supermarket', database);
    let delimiter = ';';
    let statement = '';
    for (const line of sql.split(/\r?\n/)) {
      const match = line.match(/^DELIMITER\s+(.+)$/i);
      if (match) {
        delimiter = match[1];
        continue;
      }
      statement += `${line}\n`;
      if (statement.trimEnd().endsWith(delimiter)) {
        await db.query(statement.trimEnd().slice(0, -delimiter.length));
        statement = '';
      }
    }
    if (statement.trim()) await db.query(statement);
  }
  await db.query("INSERT INTO roles(role_name) VALUES ('admin'),('employee'),('customer')");
  const password = `Demo${randomBytes(4).toString('hex')}!`;
  const hash = await bcrypt.hash(password, 12);
  await db.execute(
    "INSERT INTO users(full_name,email,password_hash,role_id,status) VALUES ('Khách demo điện thoại','phone@demo.test',?,3,'active')",
    [hash],
  );
  await db.query("INSERT INTO categories(category_name) VALUES ('Trái cây'),('Đồ uống')");
  for (const [name, code, category, price, image] of [
    ['Chuối tươi', 'prod001', 1, 25000, '/assets/images/chuoi.png'],
    ['Dâu tây', 'prod002', 1, 65000, '/assets/images/dautay.jpg'],
    ['Táo đỏ', 'prod003', 1, 45000, '/assets/images/tao.png'],
    ['Sữa tươi', 'DEMO-MILK', 2, 32000, '/assets/images/suatuoi.jpg'],
  ])
    await db.execute(
      "INSERT INTO products(product_name,barcode,category_id,price,image_url,unit,stock,status) VALUES (?,?,?,?,?,'hộp',20,'active')",
      [name, code, category, price, image],
    );
  const env = {
    ...process.env,
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password,
    DB_NAME: database,
    JWT_SECRET: randomBytes(32).toString('hex'),
  };
  const children = [
    spawn(process.execPath, ['src/server.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...env, PORT: '3000' },
      windowsHide: true,
      stdio: 'inherit',
    }),
    spawn(process.execPath, ['server.mjs'], {
      cwd: fileURLToPath(new URL('../../frontend/', import.meta.url)),
      env: { ...process.env, PORT: '5173', API_ORIGIN: 'http://127.0.0.1:3000' },
      windowsHide: true,
      stdio: 'inherit',
    }),
  ];
  console.log(
    `Demo DB: ${database}\nLocal URL: http://127.0.0.1:5173/#profile\nDemo login: phone@demo.test\nDemo password: ${password}\nDB demo được giữ lại khi dừng, không tác động DB nhóm.`,
  );
  let stopping = false;
  function stop() {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill();
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  for (const child of children) child.on('exit', stop);
} finally {
  await db.end();
}
