import mysql from 'mysql2/promise';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.CODESPACE_SETUP !== '1' || process.env.NODE_ENV !== 'development') {
  throw new Error('Only run in the configured development container.');
}
const database = process.env.DB_NAME;
if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Invalid DB_NAME');
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database,
});
try {
  await db.query(
    'CREATE TABLE IF NOT EXISTS codespaces_migrations (name VARCHAR(120) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
  );
  for (const file of [
    '01_schema.sql',
    '03_buoi4_auth_schema.sql',
    '05_buoi5_migration.sql',
    '10_buoi6_migration.sql',
    '13_buoi7_vinh_migration.sql',
    'cn09_shift_end.sql',
  ]) {
    const [done] = await db.execute('SELECT name FROM codespaces_migrations WHERE name=?', [file]);
    if (done.length) continue;
    const [column] =
      file === 'cn09_shift_end.sql'
        ? await db.query("SHOW COLUMNS FROM work_shifts LIKE 'ended_at'")
        : [[]];
    if (!column.length) {
      const sql = (
        await readFile(new URL('../../database/' + file, import.meta.url), 'utf8')
      ).replaceAll('mini_supermarket', database);
      let delimiter = ';',
        statement = '';
      for (const line of sql.split(/\r?\n/)) {
        const match = line.match(/^DELIMITER\s+(.+)$/i);
        if (match) {
          delimiter = match[1];
          continue;
        }
        statement += line + '\n';
        if (statement.trimEnd().endsWith(delimiter)) {
          await db.query(statement.trimEnd().slice(0, -delimiter.length));
          statement = '';
        }
      }
      if (statement.trim()) await db.query(statement);
    }
    await db.execute('INSERT INTO codespaces_migrations(name) VALUES (?)', [file]);
    console.log('Migration OK:', file);
  }
  const [seeded] = await db.execute('SELECT name FROM codespaces_migrations WHERE name=?', [
    'demo-products-v1',
  ]);
  if (!seeded.length) {
    await db.beginTransaction();
    try {
      await db.execute(
        'INSERT INTO categories(category_name) VALUES (?) ON DUPLICATE KEY UPDATE category_name=VALUES(category_name)',
        ['Hàng demo Codespaces'],
      );
      const [[category]] = await db.execute(
        'SELECT category_id FROM categories WHERE category_name=?',
        ['Hàng demo Codespaces'],
      );
      for (const [code, name, price] of [
        ['CS-DEMO-01', 'Sữa demo', 25000],
        ['CS-DEMO-02', 'Táo demo', 35000],
      ]) {
        const [exists] = await db.execute('SELECT product_id FROM products WHERE barcode=?', [
          code,
        ]);
        if (!exists.length)
          await db.execute(
            "INSERT INTO products(product_name,barcode,price,unit,stock,category_id,status) VALUES (?,?,?,'hộp',20,?,'active')",
            [name, code, price, category.category_id],
          );
      }
      await db.execute('INSERT INTO codespaces_migrations(name) VALUES (?)', ['demo-products-v1']);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }
} finally {
  await db.end();
}

// Never overwrite existing local secrets on container rebuild.
if (!process.argv.includes('--database-only')) {
  try {
    await writeFile(
      new URL('../.env', import.meta.url),
      `NODE_ENV=development\nPORT=3000\nJWT_SECRET=${randomBytes(32).toString('hex')}\nCORS_ORIGINS=http://localhost:5173\n`,
      { flag: 'wx', mode: 0o600 },
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
const seed = spawnSync(process.execPath, ['scripts/create-demo-accounts.js', '--shared'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: process.env,
  stdio: 'inherit',
});
if (seed.status !== 0) throw new Error('Demo account setup failed');
console.log(
  'Ready. Terminal 1: cd backend && npm start. Terminal 2: cd frontend && npm start. Open port 5173 (Private).',
);
