import { Router } from "express";
import { db } from "../db/index.js";
import { v4 as uuid } from "uuid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { checkVehicleEligibility } from "../utils/eligibility.js";

const router = Router();
router.use(requireAuth, requireRole("driver"));

// ── Profile & documents ─────────────────────────────────
router.get("/me", (req, res) => {
  const driver = db.prepare("SELECT * FROM drivers WHERE user_id = ?").get(req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ ...driver, name: user.name, mobile: user.mobile, status: user.status });
});

router.put("/profile", (req, res) => {
  const { name, address, license_no, aadhaar_no } = req.body;
  if (name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.user.id);
  db.prepare(
    "UPDATE drivers SET address = COALESCE(?, address), license_no = COALESCE(?, license_no), aadhaar_no = COALESCE(?, aadhaar_no) WHERE user_id = ?"
  ).run(address, license_no, aadhaar_no, req.user.id);
  res.json({ message: "Profile updated." });
});

// Documents & selfie are expected as base64 strings or URLs (upload handling
// is left pluggable — swap in S3/Cloudinary in production).
router.put("/documents", (req, res) => {
  const { license_doc, aadhaar_doc, rc_doc, insurance_doc, pollution_doc, vehicle_photos, selfie } = req.body;
  const current = db.prepare("SELECT documents_json FROM drivers WHERE user_id = ?").get(req.user.id);
  const docs = { ...JSON.parse(current?.documents_json || "{}") };
  if (license_doc) docs.license_doc = license_doc;
  if (aadhaar_doc) docs.aadhaar_doc = aadhaar_doc;
  if (rc_doc) docs.rc_doc = rc_doc;
  if (insurance_doc) docs.insurance_doc = insurance_doc;
  if (pollution_doc) docs.pollution_doc = pollution_doc;
  if (vehicle_photos) docs.vehicle_photos = vehicle_photos;
  if (selfie) docs.selfie = selfie;

  db.prepare("UPDATE drivers SET documents_json = ?, selfie_verified = ? WHERE user_id = ?").run(
    JSON.stringify(docs),
    selfie ? 1 : 0,
    req.user.id
  );
  res.json({ message: "Documents uploaded. Pending admin verification." });
});

// ── Vehicle submission ──────────────────────────────────
router.post("/vehicles", (req, res) => {
  const { model_name, registration_no, category, rc_doc, insurance_doc, pollution_doc, photos } = req.body;
  const eligibility = checkVehicleEligibility(model_name);
  if (eligibility.allowed === false) {
    return res.status(400).json({ error: eligibility.reason });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO vehicles (id, driver_id, model_name, category, registration_no, rc_doc, insurance_doc, pollution_doc, photos_json, approval_status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    req.user.id,
    model_name,
    category,
    registration_no,
    rc_doc || null,
    insurance_doc || null,
    pollution_doc || null,
    JSON.stringify(photos || []),
    eligibility.allowed === true ? "pending" : "pending"
  );
  res.status(201).json({
    id,
    message:
      eligibility.allowed === null
        ? "Vehicle submitted. Model not recognized, so it requires manual admin review."
        : "Vehicle submitted for admin approval.",
  });
});

router.get("/vehicles", (req, res) => {
  const vehicles = db.prepare("SELECT * FROM vehicles WHERE driver_id = ?").all(req.user.id);
  res.json(vehicles);
});

// ── Wallet ───────────────────────────────────────────────
router.get("/wallet", (req, res) => {
  const driver = db.prepare("SELECT wallet_balance_paise, driver_qr_code FROM drivers WHERE user_id = ?").get(req.user.id);
  const transactions = db
    .prepare("SELECT * FROM wallet_transactions WHERE driver_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(req.user.id);
  res.json({
    balance_paise: driver.wallet_balance_paise,
    balance_rupees: driver.wallet_balance_paise / 100,
    can_accept_rides: driver.wallet_balance_paise >= 0,
    blocking_message:
      driver.wallet_balance_paise < 0
        ? "Please clear your pending commission before accepting new rides."
        : null,
    driver_qr_code: driver.driver_qr_code,
    transactions,
  });
});

// Driver submits a manual commission payment (QR/UPI/bank transfer) for admin to verify
router.post("/wallet/pay-commission", (req, res) => {
  const { amount_paise, method, reference_note } = req.body;
  const id = uuid();
  const driver = db.prepare("SELECT wallet_balance_paise FROM drivers WHERE user_id = ?").get(req.user.id);
  db.prepare(
    `INSERT INTO wallet_transactions (id, driver_id, type, amount_paise, balance_after_paise, note, verified_by_admin)
     VALUES (?,?,?,?,?,?,0)`
  ).run(id, req.user.id, "commission_payment", amount_paise, driver.wallet_balance_paise, `[${method}] ${reference_note || "Pending admin verification"}`);
  res.status(201).json({ message: "Payment submitted. Awaiting admin verification.", transaction_id: id });
});

// ── Online/offline toggle (blocked if wallet negative) ──
router.post("/status/online", (req, res) => {
  const driver = db.prepare("SELECT wallet_balance_paise, approval_status FROM drivers WHERE user_id = ?").get(req.user.id);
  if (driver.approval_status !== "approved") {
    return res.status(403).json({ error: "Your driver profile is not yet approved by the admin." });
  }
  if (driver.wallet_balance_paise < 0) {
    return res.status(403).json({ error: "Please clear your pending commission before accepting new rides." });
  }
  db.prepare("UPDATE drivers SET is_online = 1 WHERE user_id = ?").run(req.user.id);
  res.json({ message: "You are now online." });
});

router.post("/status/offline", (req, res) => {
  db.prepare("UPDATE drivers SET is_online = 0 WHERE user_id = ?").run(req.user.id);
  res.json({ message: "You are now offline." });
});

// ── Ride requests & lifecycle ───────────────────────────
router.get("/rides/requests", (req, res) => {
  const rides = db.prepare("SELECT * FROM bookings WHERE status = 'searching' ORDER BY requested_at DESC").all();
  res.json(rides);
});

router.post("/rides/:id/accept", (req, res) => {
  const driver = db.prepare("SELECT wallet_balance_paise FROM drivers WHERE user_id = ?").get(req.user.id);
  if (driver.wallet_balance_paise < 0) {
    return res.status(403).json({ error: "Please clear your pending commission before accepting new rides." });
  }
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!booking || booking.status !== "searching") {
    return res.status(400).json({ error: "This ride is no longer available." });
  }
  db.prepare(
    "UPDATE bookings SET driver_id = ?, status = 'accepted', accepted_at = datetime('now') WHERE id = ?"
  ).run(req.user.id, req.params.id);
  res.json({ message: "Ride accepted." });
});

router.post("/rides/:id/start", (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND driver_id = ?").get(req.params.id, req.user.id);
  if (!booking) return res.status(404).json({ error: "Ride not found." });
  db.prepare("UPDATE bookings SET status = 'ongoing', started_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ message: "Ride started." });
});

router.post("/rides/:id/complete", (req, res) => {
  const { payment_method } = req.body;
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND driver_id = ?").get(req.params.id, req.user.id);
  if (!booking) return res.status(404).json({ error: "Ride not found." });

  const settings = db.prepare("SELECT commission_percent FROM company_settings WHERE id = 1").get();
  const commissionPaise = Math.round((booking.fare_paise * settings.commission_percent) / 100);
  const driverEarningPaise = booking.fare_paise - commissionPaise;

  db.prepare(
    `UPDATE bookings SET status = 'completed', completed_at = datetime('now'),
     commission_paise = ?, driver_earning_paise = ?, payment_method = ? WHERE id = ?`
  ).run(commissionPaise, driverEarningPaise, payment_method || "cash", req.params.id);

  // Deduct commission from driver wallet (driver collected full fare directly from passenger)
  const driver = db.prepare("SELECT wallet_balance_paise FROM drivers WHERE user_id = ?").get(req.user.id);
  const newBalance = driver.wallet_balance_paise - commissionPaise;
  db.prepare("UPDATE drivers SET wallet_balance_paise = ? WHERE user_id = ?").run(newBalance, req.user.id);

  const txId = uuid();
  db.prepare(
    `INSERT INTO wallet_transactions (id, driver_id, booking_id, type, amount_paise, balance_after_paise, note)
     VALUES (?,?,?,?,?,?,?)`
  ).run(txId, req.user.id, req.params.id, "commission_debit", -commissionPaise, newBalance, `Commission for ride ${req.params.id}`);

  res.json({
    message: "Ride completed.",
    fare_paise: booking.fare_paise,
    commission_paise: commissionPaise,
    driver_earning_paise: driverEarningPaise,
    wallet_balance_paise: newBalance,
    wallet_warning: newBalance < 0 ? "Please clear your pending commission before accepting new rides." : null,
  });
});

router.get("/rides/history", (req, res) => {
  const rides = db.prepare("SELECT * FROM bookings WHERE driver_id = ? ORDER BY requested_at DESC").all(req.user.id);
  res.json(rides);
});

router.get("/earnings", (req, res) => {
  const row = db
    .prepare(
      `SELECT COUNT(*) as completed_rides, COALESCE(SUM(driver_earning_paise),0) as total_earnings_paise,
              COALESCE(SUM(commission_paise),0) as total_commission_paise
       FROM bookings WHERE driver_id = ? AND status = 'completed'`
    )
    .get(req.user.id);
  res.json(row);
});

export default router;
