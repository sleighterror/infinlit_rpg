import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'infinlit.sqlite');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

export const db = new Database(dbPath);

export function initDb() {
  const schema = fs.readFileSync(path.join(process.cwd(), 'src/schema.sql'), 'utf8');
  db.exec(schema);
}