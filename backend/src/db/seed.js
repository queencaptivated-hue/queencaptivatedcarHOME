import { db } from "./index.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

// ── Rental pricing categories ──────────────────────────
const pricing = [
  { category: "category_1", min_rate_paise: 159900, max_rate_paise: 249900, label: "High-clearance hatchbacks / compact crossovers (WagonR, Brezza)" },
  { category: "category_2", min_rate_paise: 209900, max_rate_paise: 349900, label: "Sedans & mid-size SUVs (Creta, Seltos, Verna, City)" },
  { category: "category_3", min_rate_paise: 249900, max_rate_paise: 499900, label: "SUVs / MPVs (Bolero, Scorpio, Fortuner, Innova, Safari, Harrier, XUV700)" },
];
const upsertPricing = db.prepare(`
  INSERT INTO pricing (category, min_rate_paise, max_rate_paise, label)
  VALUES (@category, @min_rate_paise, @max_rate_paise, @label)
  ON CONFLICT(category) DO UPDATE SET
    min_rate_paise=excluded.min_rate_paise,
    max_rate_paise=excluded.max_rate_paise,
    label=excluded.label
`);
pricing.forEach((p) => upsertPricing.run(p));

// ── Vehicle eligibility rules (ground clearance policy) ─
const rejected = ["alto", "alto k10", "maruti 800", "celerio", "s-presso", "eeco", "omni"];
const approved = [
  "wagonr", "brezza", "creta", "kia seltos", "seltos", "bolero", "scorpio", "xuv700",
  "thar", "fortuner", "innova", "grand vitara", "hyryder", "nexon", "ertiga", "xl6",
  "safari", "harrier", "jimny", "verna", "city",
];
const upsertRule = db.prepare(`
  INSERT INTO vehicle_eligibility_rules (model_name, allowed, reason)
  VALUES (@model_name, @allowed, @reason)
  ON CONFLICT(model_name) DO UPDATE SET allowed=excluded.allowed, reason=excluded.reason
`);
rejected.forEach((m) =>
  upsertRule.run({ model_name: m, allowed: 0, reason: "Insufficient ground clearance for local terrain" })
);
approved.forEach((m) => upsertRule.run({ model_name: m, allowed: 1, reason: null }));

// ── Default Super Admin (mobile: 9999999999 / password: Admin@123) ─
const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1").get();
if (!existingAdmin) {
  const id = uuid();
  const hash = bcrypt.hashSync("Admin@123", 10);
  db.prepare(
    "INSERT INTO users (id, role, mobile, name, password_hash, status) VALUES (?,?,?,?,?,?)"
  ).run(id, "super_admin", "9999999999", "QUEEN CAPTIVATED Admin", hash, "active");
  console.log("Seeded super admin -> mobile: 9999999999, password: Admin@123");
}

console.log("Seed complete.");
