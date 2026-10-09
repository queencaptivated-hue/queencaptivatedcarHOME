import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE
  ? path.resolve(process.cwd(), process.env.DB_FILE)
  : path.resolve(__dirname, "../../data/queen_captivated.sqlite");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('super_admin','driver','passenger')),
  mobile TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','blocked','pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY,
  mobile TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address TEXT,
  license_no TEXT,
  aadhaar_no TEXT,
  documents_json TEXT DEFAULT '{}',
  selfie_verified INTEGER NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')),
  wallet_balance_paise INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL NOT NULL DEFAULT 5.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  driver_qr_code TEXT,
  is_online INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  driver_id TEXT REFERENCES drivers(user_id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('category_1','category_2','category_3')),
  registration_no TEXT NOT NULL,
  rc_doc TEXT,
  insurance_doc TEXT,
  pollution_doc TEXT,
  photos_json TEXT DEFAULT '[]',
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing (
  category TEXT PRIMARY KEY CHECK(category IN ('category_1','category_2','category_3')),
  min_rate_paise INTEGER NOT NULL,
  max_rate_paise INTEGER NOT NULL,
  label TEXT
);

CREATE TABLE IF NOT EXISTS village_pricing (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rate_per_km_paise INTEGER NOT NULL DEFAULT 4500
);

CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  commission_percent REAL NOT NULL DEFAULT 20,
  company_qr_code TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  passenger_id TEXT REFERENCES users(id),
  driver_id TEXT REFERENCES drivers(user_id),
  vehicle_id TEXT REFERENCES vehicles(id),
  trip_type TEXT NOT NULL CHECK(trip_type IN ('one_way','round_trip','village_to_village','airport_pickup')),
  pickup_label TEXT NOT NULL,
  pickup_lat REAL,
  pickup_lng REAL,
  drop_label TEXT NOT NULL,
  drop_lat REAL,
  drop_lng REAL,
  distance_km REAL,
  fare_paise INTEGER,
  commission_paise INTEGER,
  driver_earning_paise INTEGER,
  payment_method TEXT CHECK(payment_method IN ('cash','gpay','phonepe','upi','wallet')),
  status TEXT NOT NULL DEFAULT 'searching' CHECK(status IN ('searching','accepted','arriving','ongoing','completed','cancelled')),
  otp_code TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  driver_id TEXT REFERENCES drivers(user_id),
  booking_id TEXT REFERENCES bookings(id),
  type TEXT NOT NULL CHECK(type IN ('commission_debit','commission_payment','adjustment')),
  amount_paise INTEGER NOT NULL,
  balance_after_paise INTEGER NOT NULL,
  note TEXT,
  verified_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id),
  driver_id TEXT REFERENCES drivers(user_id),
  passenger_id TEXT REFERENCES users(id),
  stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favourite_drivers (
  passenger_id TEXT REFERENCES users(id),
  driver_id TEXT REFERENCES drivers(user_id),
  PRIMARY KEY (passenger_id, driver_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_eligibility_rules (
  model_name TEXT PRIMARY KEY,
  allowed INTEGER NOT NULL,
  reason TEXT
);
`;

db.exec(schema);

// Seed default company settings row if absent
const settingsRow = db.prepare("SELECT * FROM company_settings WHERE id = 1").get();
if (!settingsRow) {
  db.prepare(
    "INSERT INTO company_settings (id, commission_percent) VALUES (1, ?)"
  ).run(Number(process.env.DEFAULT_COMMISSION_PERCENT || 20));
}

const villageRow = db.prepare("SELECT * FROM village_pricing WHERE id = 1").get();
if (!villageRow) {
  db.prepare("INSERT INTO village_pricing (id, rate_per_km_paise) VALUES (1, 4500)").run();
}

export default db;
