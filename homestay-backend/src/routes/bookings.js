const express = require('express');
const db = require('../db');
const { newId } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function nightsBetween(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.round(ms / 86400000);
}

router.post('/', requireAuth('customer'), (req, res) => {
  const { roomId, checkin, checkout, guests } = req.body;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room || !room.active) return res.status(404).json({ error: 'This listing is not available.' });

  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(room.landlord_id);
  if (!landlord || landlord.status === 'blocked') return res.status(400).json({ error: 'This host is currently unavailable.' });
  if (landlord.wallet_balance < 0) {
    return res.status(400).json({ error: 'This host has an unpaid platform commission balance and cannot accept new bookings right now.' });
  }

  const nights = nightsBetween(checkin, checkout);
  if (!checkin || !checkout || nights <= 0) return res.status(400).json({ error: 'Check-out date must be after check-in date.' });
  if (!guests || guests < 1 || guests > room.max_guests) return res.status(400).json({ error: `Guests must be between 1 and ${room.max_guests}.` });

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const total = nights * room.price;
  const commission = Math.round((total * settings.commission_rate) / 100);
  const bookingId = newId('booking');

  const runTxn = db.transaction(() => {
    db.prepare(`INSERT INTO bookings (id, room_id, customer_id, checkin, checkout, guests, total, commission, status, created_at)
                VALUES (?,?,?,?,?,?,?,?,'Confirmed',?)`)
      .run(bookingId, room.id, req.user.id, checkin, checkout, Number(guests), total, commission, Date.now());
    db.prepare('UPDATE landlords SET wallet_balance = wallet_balance - ? WHERE id = ?').run(commission, landlord.id);
  });
  runTxn();

  res.status(201).json({ id: bookingId, total, commission, nights });
});

router.get('/mine', requireAuth('customer'), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, r.title AS room_title, r.location AS room_location
    FROM bookings b JOIN rooms r ON r.id = b.room_id
    WHERE b.customer_id = ? ORDER BY b.created_at DESC`).all(req.user.id);
  res.json(rows.map(b => ({
    id: b.id, roomTitle: b.room_title, roomLocation: b.room_location,
    checkin: b.checkin, checkout: b.checkout, guests: b.guests,
    total: b.total, status: b.status,
  })));
});

router.get('/landlord/mine', requireAuth('landlord'), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, r.title AS room_title, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN customers c ON c.id = b.customer_id
    WHERE r.landlord_id = ?
    ORDER BY b.created_at DESC`).all(req.user.id);
  res.json(rows.map(b => ({
    id: b.id, roomTitle: b.room_title, checkin: b.checkin, checkout: b.checkout,
    guests: b.guests, total: b.total, commission: b.commission, status: b.status,
    customerName: b.customer_name, customerPhone: b.customer_phone, customerEmail: b.customer_email,
  })));
});

module.exports = router;
