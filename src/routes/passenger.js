import { Router } from "express";
import { db } from "../db/index.js";
import { v4 as uuid } from "uuid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { estimateDistanceKm } from "../utils/distance.js";

const router = Router();
router.use(requireAuth, requireRole("passenger"));

// ── Browse approved, available vehicles ─────────────────
router.get("/vehicles", (req, res) => {
  const { category } = req.query;
  let query = `
    SELECT v.*, d.rating_avg, d.rating_count, u.name as driver_name
    FROM vehicles v
    JOIN drivers d ON d.user_id = v.driver_id
    JOIN users u ON u.id = d.user_id
    WHERE v.approval_status = 'approved' AND d.is_online = 1 AND d.approval_status = 'approved'`;
  const params = [];
  if (category) {
    query += " AND v.category = ?";
    params.push(category);
  }
  res.json(db.prepare(query).all(...params));
});

router.get("/pricing", (req, res) => {
  const categories = db.prepare("SELECT * FROM pricing").all();
  const village = db.prepare("SELECT * FROM village_pricing WHERE id = 1").get();
  res.json({ categories, village_rate_per_km_paise: village.rate_per_km_paise });
});

// ── Fare estimate ────────────────────────────────────────
router.post("/fare-estimate", (req, res) => {
  const { trip_type, pickup_lat, pickup_lng, drop_lat, drop_lng, category } = req.body;
  const distance = estimateDistanceKm(pickup_lat, pickup_lng, drop_lat, drop_lng);
  if (!distance) return res.status(400).json({ error: "Pickup and drop coordinates are required." });

  let farePaise;
  if (trip_type === "village_to_village") {
    const village = db.prepare("SELECT * FROM village_pricing WHERE id = 1").get();
    farePaise = Math.round(distance.distanceKm * village.rate_per_km_paise);
  } else {
    const priceRow = db.prepare("SELECT * FROM pricing WHERE category = ?").get(category);
    if (!priceRow) return res.status(400).json({ error: "Invalid vehicle category." });
    // Simple proportional pricing within category band based on distance (capped at 300km/day equivalent)
    const dayFraction = Math.min(1, Math.max(0.4, distance.distanceKm / 150));
    farePaise = Math.round(priceRow.min_rate_paise + (priceRow.max_rate_paise - priceRow.min_rate_paise) * dayFraction);
    if (trip_type === "round_trip") farePaise = Math.round(farePaise * 1.8);
  }

  res.json({
    distance_km: distance.distanceKm,
    eta_minutes: distance.etaMinutes,
    fare_paise: farePaise,
    fare_rupees: farePaise / 100,
  });
});

// ── Booking ──────────────────────────────────────────────
router.post("/bookings", (req, res) => {
  const {
    trip_type, pickup_label, pickup_lat, pickup_lng,
    drop_label, drop_lat, drop_lng, category, vehicle_id,
  } = req.body;

  const distance = estimateDistanceKm(pickup_lat, pickup_lng, drop_lat, drop_lng);
  let farePaise;
  if (trip_type === "village_to_village") {
    const village = db.prepare("SELECT * FROM village_pricing WHERE id = 1").get();
    farePaise = Math.round((distance?.distanceKm || 0) * village.rate_per_km_paise);
  } else {
    const priceRow = db.prepare("SELECT * FROM pricing WHERE category = ?").get(category);
    const dayFraction = Math.min(1, Math.max(0.4, (distance?.distanceKm || 20) / 150));
    farePaise = priceRow ? Math.round(priceRow.min_rate_paise + (priceRow.max_rate_paise - priceRow.min_rate_paise) * dayFraction) : 0;
    if (trip_type === "round_trip") farePaise = Math.round(farePaise * 1.8);
  }

  const id = uuid();
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  db.prepare(
    `INSERT INTO bookings (id, passenger_id, vehicle_id, trip_type, pickup_label, pickup_lat, pickup_lng,
      drop_label, drop_lat, drop_lng, distance_km, fare_paise, otp_code, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'searching')`
  ).run(
    id, req.user.id, vehicle_id || null, trip_type, pickup_label, pickup_lat || null, pickup_lng || null,
    drop_label, drop_lat || null, drop_lng || null, distance?.distanceKm || null, farePaise, otp
  );

  res.status(201).json({ id, message: "Searching for a driver.", fare_paise: farePaise, ride_otp: otp });
});

router.get("/bookings/:id", (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND passenger_id = ?").get(req.params.id, req.user.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  let driver = null;
  if (booking.driver_id) {
    driver = db
      .prepare(
        `SELECT u.name, u.mobile, d.rating_avg, d.rating_count FROM drivers d JOIN users u ON u.id = d.user_id WHERE d.user_id = ?`
      )
      .get(booking.driver_id);
  }
  res.json({ ...booking, driver });
});

router.post("/bookings/:id/cancel", (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND passenger_id = ?").get(req.params.id, req.user.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (["completed", "cancelled"].includes(booking.status)) {
    return res.status(400).json({ error: "This booking can no longer be cancelled." });
  }
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: "Booking cancelled." });
});

router.get("/bookings", (req, res) => {
  const bookings = db.prepare("SELECT * FROM bookings WHERE passenger_id = ? ORDER BY requested_at DESC").all(req.user.id);
  res.json(bookings);
});

// ── Ratings & favourites ─────────────────────────────────
router.post("/bookings/:id/rate", (req, res) => {
  const { stars, comment } = req.body;
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND passenger_id = ?").get(req.params.id, req.user.id);
  if (!booking || booking.status !== "completed") {
    return res.status(400).json({ error: "You can only rate completed rides." });
  }
  const id = uuid();
  db.prepare(
    "INSERT INTO ratings (id, booking_id, driver_id, passenger_id, stars, comment) VALUES (?,?,?,?,?,?)"
  ).run(id, req.params.id, booking.driver_id, req.user.id, stars, comment || null);

  const agg = db
    .prepare("SELECT AVG(stars) as avg, COUNT(*) as cnt FROM ratings WHERE driver_id = ?")
    .get(booking.driver_id);
  db.prepare("UPDATE drivers SET rating_avg = ?, rating_count = ? WHERE user_id = ?").run(
    Math.round(agg.avg * 10) / 10, agg.cnt, booking.driver_id
  );
  res.status(201).json({ message: "Thanks for your rating." });
});

router.post("/favourites/:driverId", (req, res) => {
  db.prepare("INSERT OR IGNORE INTO favourite_drivers (passenger_id, driver_id) VALUES (?,?)").run(req.user.id, req.params.driverId);
  res.json({ message: "Added to favourites." });
});

router.get("/favourites", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.mobile, d.rating_avg FROM favourite_drivers f
       JOIN drivers d ON d.user_id = f.driver_id JOIN users u ON u.id = d.user_id
       WHERE f.passenger_id = ?`
    )
    .all(req.user.id);
  res.json(rows);
});

export default router;
