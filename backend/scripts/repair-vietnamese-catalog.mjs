// Repair reversible UTF-8 bytes mistakenly decoded as Windows-1252, catalogue only.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { TextDecoder } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const apply = process.argv.includes('--apply');
const backupArg = process.argv.find(a => a.startsWith('--backup-dir='));
if (apply && !backupArg) throw new Error('Supply --backup-dir outside the repository');
if (!['127.0.0.1','localhost','::1'].includes(process.env.DB_HOST || '127.0.0.1')) throw new Error('Local only');
const decoder = new TextDecoder('windows-1252');
const reverse = new Map(Array.from({length:256},(_,i)=>[decoder.decode(Uint8Array.of(i)),i]));
// Preserve C1 controls found in some legacy MySQL imports.
for(let i=128;i<160;i++) if(!reverse.has(String.fromCharCode(i)))reverse.set(String.fromCharCode(i),i);
function repair(text) {
  if(typeof text !== 'string' || !/[ÃÂÆÄ]|á[º»]/u.test(text))return text;
  const bytes=[];
  for(const c of text){if(!reverse.has(c))return text;bytes.push(reverse.get(c));}
  try { const fixed=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes));return fixed===text ? text : fixed; }catch{return text;}
}
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME,charset:'utf8mb4'});
try {
  await db.beginTransaction();
  const changes=[];
  for(const [table,id,fields] of [['products','product_id',['product_name','description','unit']],['inventory_items','inventory_item_id',['item_name','unit']],['categories','category_id',['category_name']]]){
    const [rows]=await db.query(`SELECT ${[id,...fields].join(',')} FROM ${table}${apply?' FOR UPDATE':''}`);
    for(const row of rows)for(const field of fields){const after=repair(row[field]);if(after!==row[field])changes.push({table,idColumn:id,id:row[id],field,before:row[field],after});}
  }
  console.log(JSON.stringify({database:process.env.DB_NAME,apply,changes},null,2));
  if(apply && changes.length){
    const dir=resolve(backupArg.slice('--backup-dir='.length));await mkdir(dir,{recursive:true});
    const path=join(dir,`vietnamese-catalog-${Date.now()}.json`);
    await writeFile(path,JSON.stringify({database:process.env.DB_NAME,createdAt:new Date().toISOString(),changes},null,2),{flag:'wx'});
    console.log('Backup:',path);
    for(const c of changes){const [r]=await db.execute(`UPDATE ${c.table} SET ${c.field}=? WHERE ${c.idColumn}=? AND BINARY ${c.field}=BINARY ?`,[c.after,c.id,c.before]);if(r.affectedRows!==1)throw new Error('Concurrent change; rollback');}
    await db.commit();console.log(`Updated ${changes.length} fields. No price, stock or ID changes.`);
  }else await db.rollback();
}catch(error){await db.rollback();throw error;}finally{await db.end();}
