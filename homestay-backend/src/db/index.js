const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS landlords (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_balance INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  landlord_id TEXT NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_photos (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  guests INTEGER NOT NULL,
  total INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  landlord_id TEXT NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  commission_rate INTEGER NOT NULL DEFAULT 20,
  qr_image_path TEXT,
  admin_password_hash TEXT NOT NULL
);
`);

// Seed the singleton settings row on first boot.
const existingSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!existingSettings) {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(initialPassword, 10);
  db.prepare('INSERT INTO settings (id, commission_rate, qr_image_path, admin_password_hash) VALUES (1, 20, NULL, ?)').run(hash);
  console.log(`[db] Seeded settings row. Initial admin password: "${initialPassword}" — change this immediately after first login.`);
}

module.exports = db;
