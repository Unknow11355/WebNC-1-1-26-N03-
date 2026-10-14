// Local development only. Never resets passwords or changes existing accounts.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const shared = process.argv.includes('--shared');
if (shared && (process.env.NODE_ENV !== 'development' || !['localhost','127.0.0.1','::1'].includes(process.env.DB_HOST || '127.0.0.1'))) {
  throw new Error('Shared demo accounts require NODE_ENV=development and a local database. Never deploy these public passwords.');
}

if (process.env.NODE_ENV === 'production' || !process.env.DB_NAME) {
  throw new Error('Only local development: explicitly set DB_NAME first.');
}
const db = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
});
const results = [];
try {
  const [columns] = await db.query('SHOW COLUMNS FROM users');
  if (!columns.some(c => c.Field === 'password_hash')) throw new Error('Apply auth migration before creating accounts.');
  const legacy = columns.some(c => c.Field === 'password');
  await db.beginTransaction();
  for (const [role, name] of [['admin','Quản trị demo Linh'],['customer','Khách hàng demo Linh'],['employee','Nhân viên demo Linh']]) {
    const email = shared ? `${role}.nhom03@demo.local` : `${role}.linh@demo.local`;
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email=?',[email]);
    if (existing.length) { results.push({email,status:'Đã tồn tại; giữ nguyên tài khoản/mật khẩu'}); continue; }
    await db.execute('INSERT INTO roles(role_name) VALUES (?) ON DUPLICATE KEY UPDATE role_name=VALUES(role_name)',[role]);
    const [[r]] = await db.execute('SELECT role_id FROM roles WHERE role_name=?',[role]);
    const password = shared ? 'Nhom03@Demo2026!' : 'Demo!' + randomBytes(9).toString('hex') + 'Aa1';
    const hash = await bcrypt.hash(password,12);
    const fields = ['full_name','email','password_hash','role_id','status','employment_type'];
    const values = [name,email,hash,r.role_id,'active','full_time'];
    if (legacy) {fields.push('password');values.push(hash);}
    await db.execute(`INSERT INTO users (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,values);
    results.push({role,email,password,status:'Đã tạo'});
  }
  await db.commit();
  console.log(JSON.stringify({database:process.env.DB_NAME,accounts:results},null,2));
} catch(error) {
  await db.rollback();
  throw error;
} finally { await db.end(); }
