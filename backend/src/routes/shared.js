import { Router } from "express";
import { db } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/notifications", (req, res) => {
  const rows = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(req.user.id);
  res.json(rows);
});

router.post("/notifications/:id/read", (req, res) => {
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ message: "Marked as read." });
});

// Receipt data for a completed booking (rendered as a printable page on the frontend / exportable to PDF)
router.get("/receipts/:bookingId", (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  const isOwner = booking.passenger_id === req.user.id || booking.driver_id === req.user.id || req.user.role === "super_admin";
  if (!isOwner) return res.status(403).json({ error: "Not authorized to view this receipt." });

  const passenger = db.prepare("SELECT name, mobile FROM users WHERE id = ?").get(booking.passenger_id);
  const driver = booking.driver_id ? db.prepare("SELECT name, mobile FROM users WHERE id = ?").get(booking.driver_id) : null;
  const vehicle = booking.vehicle_id ? db.prepare("SELECT model_name, registration_no FROM vehicles WHERE id = ?").get(booking.vehicle_id) : null;
  const company = db.prepare("SELECT * FROM company_settings WHERE id = 1").get();

  res.json({
    booking_id: booking.id,
    company: "QUEEN CAPTIVATED",
    date: booking.completed_at || booking.requested_at,
    passenger,
    driver,
    vehicle,
    trip_type: booking.trip_type,
    pickup: booking.pickup_label,
    drop: booking.drop_label,
    distance_km: booking.distance_km,
    fare_paise: booking.fare_paise,
    fare_rupees: booking.fare_paise ? booking.fare_paise / 100 : null,
    commission_paise: booking.commission_paise,
    driver_earning_paise: booking.driver_earning_paise,
    payment_method: booking.payment_method,
    status: booking.status,
    commission_percent_applied: company.commission_percent,
  });
});

export default router;
