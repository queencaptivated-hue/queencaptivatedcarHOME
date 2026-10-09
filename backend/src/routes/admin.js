import { Router } from "express";
import { db } from "../db/index.js";
import { v4 as uuid } from "uuid";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// ── Driver management ────────────────────────────────────
router.get("/drivers", (req, res) => {
  const { status } = req.query;
  let query = `SELECT u.id, u.name, u.mobile, u.status as account_status, d.* FROM drivers d JOIN users u ON u.id = d.user_id`;
  const params = [];
  if (status) {
    query += " WHERE d.approval_status = ?";
    params.push(status);
  }
  res.json(db.prepare(query).all(...params));
});

router.post("/drivers/:id/approve", (req, res) => {
  db.prepare("UPDATE drivers SET approval_status = 'approved' WHERE user_id = ?").run(req.params.id);
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(req.params.id);
  notify(req.params.id, "Driver application approved", "You can now go online and accept rides.");
  res.json({ message: "Driver approved." });
});

router.post("/drivers/:id/reject", (req, res) => {
  const { reason } = req.body;
  db.prepare("UPDATE drivers SET approval_status = 'rejected' WHERE user_id = ?").run(req.params.id);
  notify(req.params.id, "Driver application rejected", reason || "Please contact support for details.");
  res.json({ message: "Driver rejected." });
});

router.post("/drivers/:id/suspend", (req, res) => {
  db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE drivers SET is_online = 0 WHERE user_id = ?").run(req.params.id);
  notify(req.params.id, "Account suspended", "Your account has been temporarily suspended.");
  res.json({ message: "Driver suspended." });
});

router.post("/drivers/:id/block", (req, res) => {
  db.prepare("UPDATE users SET status = 'blocked' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE drivers SET is_online = 0 WHERE user_id = ?").run(req.params.id);
  notify(req.params.id, "Account blocked", "Your account has been blocked. Contact support.");
  res.json({ message: "Driver blocked." });
});

router.post("/drivers/:id/reactivate", (req, res) => {
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(req.params.id);
  res.json({ message: "Driver reactivated." });
});

// Admin can directly register a driver
router.post("/drivers/register", (req, res) => {
  const { mobile, name } = req.body;
  const existing = db.prepare("SELECT * FROM users WHERE mobile = ?").get(mobile);
  if (existing) return res.status(409).json({ error: "A user with this mobile number already exists." });
  const id = uuid();
  db.prepare("INSERT INTO users (id, role, mobile, name, status) VALUES (?, 'driver', ?, ?, 'pending')").run(id, mobile, name);
  db.prepare("INSERT INTO drivers (user_id) VALUES (?)").run(id);
  res.status(201).json({ id, message: "Driver registered. They can complete profile setup by logging in with OTP." });
});

// ── Vehicle approvals ────────────────────────────────────
router.get("/vehicles", (req, res) => {
  const { status } = req.query;
  let query = `SELECT v.*, u.name as driver_name, u.mobile as driver_mobile FROM vehicles v JOIN users u ON u.id = v.driver_id`;
  const params = [];
  if (status) {
    query += " WHERE v.approval_status = ?";
    params.push(status);
  }
  res.json(db.prepare(query).all(...params));
});

router.post("/vehicles/:id/approve", (req, res) => {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  db.prepare("UPDATE vehicles SET approval_status = 'approved', rejection_reason = NULL WHERE id = ?").run(req.params.id);
  notify(vehicle.driver_id, "Vehicle approved", `${vehicle.model_name} (${vehicle.registration_no}) is now approved.`);
  res.json({ message: "Vehicle approved." });
});

router.post("/vehicles/:id/reject", (req, res) => {
  const { reason } = req.body;
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  db.prepare("UPDATE vehicles SET approval_status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason || null, req.params.id);
  notify(vehicle.driver_id, "Vehicle rejected", reason || "Vehicle did not meet eligibility requirements.");
  res.json({ message: "Vehicle rejected." });
});

// ── Vehicle eligibility rule list (editable) ────────────
router.get("/eligibility-rules", (req, res) => {
  res.json(db.prepare("SELECT * FROM vehicle_eligibility_rules ORDER BY allowed DESC, model_name").all());
});

router.put("/eligibility-rules", (req, res) => {
  const { model_name, allowed, reason } = req.body;
  db.prepare(
    `INSERT INTO vehicle_eligibility_rules (model_name, allowed, reason) VALUES (?,?,?)
     ON CONFLICT(model_name) DO UPDATE SET allowed=excluded.allowed, reason=excluded.reason`
  ).run(String(model_name).toLowerCase().trim(), allowed ? 1 : 0, reason || null);
  res.json({ message: "Eligibility rule updated." });
});

router.delete("/eligibility-rules/:modelName", (req, res) => {
  db.prepare("DELETE FROM vehicle_eligibility_rules WHERE model_name = ?").run(req.params.modelName.toLowerCase());
  res.json({ message: "Rule removed." });
});

// ── Pricing ──────────────────────────────────────────────
router.get("/pricing", (req, res) => {
  res.json({
    categories: db.prepare("SELECT * FROM pricing").all(),
    village: db.prepare("SELECT * FROM village_pricing WHERE id = 1").get(),
  });
});

router.put("/pricing/:category", (req, res) => {
  const { min_rate_paise, max_rate_paise, label } = req.body;
  db.prepare(
    "UPDATE pricing SET min_rate_paise = COALESCE(?, min_rate_paise), max_rate_paise = COALESCE(?, max_rate_paise), label = COALESCE(?, label) WHERE category = ?"
  ).run(min_rate_paise, max_rate_paise, label, req.params.category);
  res.json({ message: "Pricing updated." });
});

router.put("/pricing/village/rate", (req, res) => {
  const { rate_per_km_paise } = req.body;
  db.prepare("UPDATE village_pricing SET rate_per_km_paise = ? WHERE id = 1").run(rate_per_km_paise);
  res.json({ message: "Village rate updated." });
});

// ── Commission / company settings ───────────────────────
router.get("/settings", (req, res) => {
  res.json(db.prepare("SELECT * FROM company_settings WHERE id = 1").get());
});

router.put("/settings", (req, res) => {
  const { commission_percent, company_qr_code, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id } = req.body;
  db.prepare(
    `UPDATE company_settings SET
      commission_percent = COALESCE(?, commission_percent),
      company_qr_code = COALESCE(?, company_qr_code),
      bank_account_name = COALESCE(?, bank_account_name),
      bank_account_number = COALESCE(?, bank_account_number),
      bank_ifsc = COALESCE(?, bank_ifsc),
      bank_name = COALESCE(?, bank_name),
      upi_id = COALESCE(?, upi_id)
     WHERE id = 1`
  ).run(commission_percent, company_qr_code, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id);
  res.json({ message: "Settings updated." });
});

// ── Wallet / commission verification ────────────────────
router.get("/wallets", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.mobile, d.wallet_balance_paise FROM drivers d JOIN users u ON u.id = d.user_id ORDER BY d.wallet_balance_paise ASC`
    )
    .all();
  res.json(rows);
});

router.get("/wallets/pending-payments", (req, res) => {
  const rows = db
    .prepare(
      `SELECT wt.*, u.name as driver_name, u.mobile as driver_mobile FROM wallet_transactions wt
       JOIN users u ON u.id = wt.driver_id
       WHERE wt.type = 'commission_payment' AND wt.verified_by_admin = 0
       ORDER BY wt.created_at DESC`
    )
    .all();
  res.json(rows);
});

router.post("/wallets/verify-payment/:txId", (req, res) => {
  const tx = db.prepare("SELECT * FROM wallet_transactions WHERE id = ?").get(req.params.txId);
  if (!tx) return res.status(404).json({ error: "Transaction not found." });
  if (tx.verified_by_admin) return res.status(400).json({ error: "Already verified." });

  const driver = db.prepare("SELECT wallet_balance_paise FROM drivers WHERE user_id = ?").get(tx.driver_id);
  const newBalance = driver.wallet_balance_paise + tx.amount_paise;
  db.prepare("UPDATE drivers SET wallet_balance_paise = ? WHERE user_id = ?").run(newBalance, tx.driver_id);
  db.prepare("UPDATE wallet_transactions SET verified_by_admin = 1, balance_after_paise = ? WHERE id = ?").run(newBalance, tx.id);
  notify(tx.driver_id, "Commission payment verified", `Your payment has been verified. Wallet balance: ₹${(newBalance / 100).toFixed(2)}`);
  res.json({ message: "Payment verified and wallet updated.", new_balance_paise: newBalance });
});

router.post("/wallets/:driverId/adjust", (req, res) => {
  const { amount_paise, note } = req.body;
  const driver = db.prepare("SELECT wallet_balance_paise FROM drivers WHERE user_id = ?").get(req.params.driverId);
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  const newBalance = driver.wallet_balance_paise + amount_paise;
  db.prepare("UPDATE drivers SET wallet_balance_paise = ? WHERE user_id = ?").run(newBalance, req.params.driverId);
  const id = uuid();
  db.prepare(
    "INSERT INTO wallet_transactions (id, driver_id, type, amount_paise, balance_after_paise, note, verified_by_admin) VALUES (?,?,?,?,?,?,1)"
  ).run(id, req.params.driverId, "adjustment", amount_paise, newBalance, note || "Manual admin adjustment");
  res.json({ message: "Wallet adjusted.", new_balance_paise: newBalance });
});

// ── Ride history (all) ──────────────────────────────────
router.get("/rides", (req, res) => {
  const rows = db.prepare("SELECT * FROM bookings ORDER BY requested_at DESC LIMIT 500").all();
  res.json(rows);
});

// ── Analytics / Reports ──────────────────────────────────
router.get("/reports/summary", (req, res) => {
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(fare_paise),0) as total_fare_paise, COALESCE(SUM(commission_paise),0) as total_commission_paise, COUNT(*) as completed_rides FROM bookings WHERE status = 'completed'`)
    .get();
  const drivers = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN approval_status='approved' THEN 1 ELSE 0 END) as approved, SUM(CASE WHEN approval_status='pending' THEN 1 ELSE 0 END) as pending FROM drivers`).get();
  const passengers = db.prepare(`SELECT COUNT(*) as total FROM users WHERE role = 'passenger'`).get();
  const vehicles = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN approval_status='approved' THEN 1 ELSE 0 END) as approved FROM vehicles`).get();
  const pendingCommission = db.prepare(`SELECT COALESCE(SUM(wallet_balance_paise),0) as total_negative FROM drivers WHERE wallet_balance_paise < 0`).get();
  res.json({ revenue, drivers, passengers, vehicles, pending_commission_paise: Math.abs(pendingCommission.total_negative) });
});

router.get("/reports/revenue", (req, res) => {
  const { period = "daily" } = req.query;
  const grouping = period === "monthly" ? "%Y-%m" : period === "weekly" ? "%Y-%W" : "%Y-%m-%d";
  const rows = db
    .prepare(
      `SELECT strftime('${grouping}', completed_at) as bucket, COUNT(*) as rides, COALESCE(SUM(fare_paise),0) as revenue_paise, COALESCE(SUM(commission_paise),0) as commission_paise
       FROM bookings WHERE status = 'completed' GROUP BY bucket ORDER BY bucket DESC LIMIT 60`
    )
    .all();
  res.json(rows);
});

router.get("/reports/driver-performance", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.name, u.mobile, d.rating_avg, d.rating_count, COUNT(b.id) as completed_rides,
              COALESCE(SUM(b.driver_earning_paise),0) as total_earnings_paise
       FROM drivers d JOIN users u ON u.id = d.user_id
       LEFT JOIN bookings b ON b.driver_id = d.user_id AND b.status = 'completed'
       GROUP BY d.user_id ORDER BY completed_rides DESC`
    )
    .all();
  res.json(rows);
});

router.get("/reports/vehicle-usage", (req, res) => {
  const rows = db
    .prepare(
      `SELECT v.model_name, v.registration_no, v.category, COUNT(b.id) as trips, COALESCE(SUM(b.fare_paise),0) as revenue_paise
       FROM vehicles v LEFT JOIN bookings b ON b.vehicle_id = v.id AND b.status = 'completed'
       GROUP BY v.id ORDER BY trips DESC`
    )
    .all();
  res.json(rows);
});

router.get("/reports/village-revenue", (req, res) => {
  const rows = db
    .prepare(
      `SELECT pickup_label, drop_label, COUNT(*) as trips, COALESCE(SUM(fare_paise),0) as revenue_paise
       FROM bookings WHERE trip_type = 'village_to_village' AND status = 'completed'
       GROUP BY pickup_label, drop_label ORDER BY revenue_paise DESC`
    )
    .all();
  res.json(rows);
});

router.get("/reports/passengers", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.name, u.mobile, COUNT(b.id) as total_bookings, COALESCE(SUM(CASE WHEN b.status='completed' THEN b.fare_paise ELSE 0 END),0) as total_spent_paise
       FROM users u LEFT JOIN bookings b ON b.passenger_id = u.id
       WHERE u.role = 'passenger' GROUP BY u.id ORDER BY total_bookings DESC`
    )
    .all();
  res.json(rows);
});

// ── Notifications (broadcast) ───────────────────────────
router.post("/notifications/broadcast", (req, res) => {
  const { title, body, role } = req.body;
  const users = role
    ? db.prepare("SELECT id FROM users WHERE role = ?").all(role)
    : db.prepare("SELECT id FROM users").all();
  const insert = db.prepare("INSERT INTO notifications (id, user_id, title, body) VALUES (?,?,?,?)");
  const tx = db.transaction((list) => {
    for (const u of list) insert.run(uuid(), u.id, title, body || null);
  });
  tx(users);
  res.json({ message: `Notification sent to ${users.length} user(s).` });
});

function notify(userId, title, body) {
  db.prepare("INSERT INTO notifications (id, user_id, title, body) VALUES (?,?,?,?)").run(uuid(), userId, title, body);
}

export default router;
