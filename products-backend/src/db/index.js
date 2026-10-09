const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  product_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Coming Soon',
  cta_text TEXT NOT NULL DEFAULT 'Learn More',
  features TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

// Safe migration for databases created before the `features` column existed.
const cols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!cols.includes('features')) {
  db.exec("ALTER TABLE products ADD COLUMN features TEXT NOT NULL DEFAULT ''");
}

// One-time seed: a default admin account, same pattern as the homestay API.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'executive@queencaptivated.in').toLowerCase();
const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(ADMIN_EMAIL);
if (!existing) {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'change-this-immediately';
  const hash = bcrypt.hashSync(initialPassword, 10);
  db.prepare('INSERT INTO admins (id, email, password_hash, created_at) VALUES (?,?,?,?)')
    .run('admin_products_1', ADMIN_EMAIL, hash, Date.now());
  console.log(`[db] Seeded products admin (${ADMIN_EMAIL}). Initial password: "${initialPassword}" — change this immediately after first login.`);
}

module.exports = db;
