const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { newId, uploadQr, uploadRoomPhotos, ROOM_DIR, QR_DIR } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth('admin'));

function isEmail(v) { return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/* ---------------- overview ---------------- */
router.get('/overview', (req, res) => {
  const landlordCount = db.prepare('SELECT COUNT(*) c FROM landlords').get().c;
  const roomCount = db.prepare('SELECT COUNT(*) c FROM rooms').get().c;
  const bookingCount = db.prepare('SELECT COUNT(*) c FROM bookings').get().c;
  const totalCommission = db.prepare('SELECT COALESCE(SUM(commission),0) s FROM bookings').get().s;
  const totalOwed = db.prepare('SELECT COALESCE(SUM(-wallet_balance),0) s FROM landlords WHERE wallet_balance < 0').get().s;
  res.json({ landlordCount, roomCount, bookingCount, totalCommission, totalOwed });
});

/* ---------------- landlords ---------------- */
router.get('/landlords', (req, res) => {
  const rows = db.prepare('SELECT * FROM landlords ORDER BY created_at DESC').all();
  res.json(rows.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, walletBalance: l.wallet_balance, status: l.status })));
});

router.post('/landlords', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !isEmail(email) || !phone || !password || password.length < 4) {
    return res.status(400).json({ error: 'Please provide a valid name, email, phone and password.' });
  }
  if (db.prepare('SELECT id FROM landlords WHERE email = ?').get(email.toLowerCase())) {
    return res.status(409).json({ error: 'A host with this email already exists.' });
  }
  const id = newId('landlord');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO landlords (id,name,email,phone,password_hash,wallet_balance,status,created_at) VALUES (?,?,?,?,?,0,\'active\',?)')
    .run(id, name, email.toLowerCase(), phone, hash, Date.now());
  res.status(201).json({ id });
});

router.put('/landlords/:id', (req, res) => {
  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(req.params.id);
  if (!landlord) return res.status(404).json({ error: 'Host not found.' });
  const { name, email, phone, password, status } = req.body;
  const hash = password ? bcrypt.hashSync(password, 10) : landlord.password_hash;
  db.prepare('UPDATE landlords SET name=?, email=?, phone=?, password_hash=?, status=? WHERE id=?')
    .run(name || landlord.name, (email || landlord.email).toLowerCase(), phone || landlord.phone, hash,
         status || landlord.status, landlord.id);
  res.json({ ok: true });
});

router.delete('/landlords/:id', (req, res) => {
  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(req.params.id);
  if (!landlord) return res.status(404).json({ error: 'Host not found.' });
  const rooms = db.prepare('SELECT * FROM rooms WHERE landlord_id = ?').all(landlord.id);
  rooms.forEach(r => {
    db.prepare('SELECT * FROM room_photos WHERE room_id = ?').all(r.id).forEach(p =>
      fs.unlink(path.join(ROOM_DIR, path.basename(p.file_path)), () => {}));
  });
  db.prepare('DELETE FROM landlords WHERE id = ?').run(landlord.id); // cascades rooms/photos/settlements
  res.json({ ok: true });
});

router.post('/landlords/:id/wallet-adjust', (req, res) => {
  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(req.params.id);
  if (!landlord) return res.status(404).json({ error: 'Host not found.' });
  const amount = Number(req.body.amount);
  if (!amount) return res.status(400).json({ error: 'Enter a non-zero amount.' });
  db.prepare('UPDATE landlords SET wallet_balance = wallet_balance + ? WHERE id = ?').run(amount, landlord.id);
  res.json({ ok: true, walletBalance: landlord.wallet_balance + amount });
});

/* ---------------- rooms (read-only overview) ---------------- */
router.get('/rooms', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, l.name AS landlord_name, l.wallet_balance, l.status AS landlord_status
    FROM rooms r JOIN landlords l ON l.id = r.landlord_id ORDER BY r.created_at DESC`).all();
  res.json(rows.map(r => ({
    id: r.id, title: r.title, location: r.location, price: r.price,
    landlordName: r.landlord_name,
    bookable: r.active === 1 && r.landlord_status !== 'blocked' && r.wallet_balance >= 0,
    photoCount: db.prepare('SELECT COUNT(*) c FROM room_photos WHERE room_id = ?').get(r.id).c,
  })));
});

/* ---------------- bookings (read-only overview) ---------------- */
router.get('/bookings', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, r.title AS room_title, l.name AS landlord_name, c.name AS customer_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN landlords l ON l.id = r.landlord_id
    JOIN customers c ON c.id = b.customer_id
    ORDER BY b.created_at DESC`).all();
  res.json(rows.map(b => ({
    id: b.id, customerName: b.customer_name, roomTitle: b.room_title, landlordName: b.landlord_name,
    checkin: b.checkin, checkout: b.checkout, total: b.total, commission: b.commission, status: b.status,
  })));
});

/* ---------------- settlements ---------------- */
router.get('/settlements', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, l.name AS landlord_name FROM settlements s
    JOIN landlords l ON l.id = s.landlord_id ORDER BY s.created_at DESC`).all();
  res.json(rows.map(s => ({ id: s.id, landlordName: s.landlord_name, amount: s.amount, note: s.note, status: s.status })));
});

router.post('/settlements/:id/approve', (req, res) => {
  const s = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Settlement request not found.' });
  if (s.status !== 'Pending') return res.status(400).json({ error: 'This request has already been decided.' });
  const runTxn = db.transaction(() => {
    db.prepare('UPDATE landlords SET wallet_balance = wallet_balance + ? WHERE id = ?').run(s.amount, s.landlord_id);
    db.prepare('UPDATE settlements SET status = \'Approved\', decided_at = ? WHERE id = ?').run(Date.now(), s.id);
  });
  runTxn();
  res.json({ ok: true });
});

router.post('/settlements/:id/reject', (req, res) => {
  const s = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Settlement request not found.' });
  if (s.status !== 'Pending') return res.status(400).json({ error: 'This request has already been decided.' });
  db.prepare('UPDATE settlements SET status = \'Rejected\', decided_at = ? WHERE id = ?').run(Date.now(), s.id);
  res.json({ ok: true });
});

/* ---------------- settings ---------------- */
router.put('/settings/commission', (req, res) => {
  const rate = Number(req.body.rate);
  if (isNaN(rate) || rate < 0 || rate > 100) return res.status(400).json({ error: 'Commission rate must be between 0 and 100.' });
  db.prepare('UPDATE settings SET commission_rate = ? WHERE id = 1').run(rate);
  res.json({ ok: true });
});

router.put('/settings/password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  db.prepare('UPDATE settings SET admin_password_hash = ? WHERE id = 1').run(bcrypt.hashSync(password, 10));
  res.json({ ok: true });
});

router.post('/settings/qr', uploadQr.single('qr'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload an image file.' });
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (settings.qr_image_path) fs.unlink(path.join(QR_DIR, path.basename(settings.qr_image_path)), () => {});
  db.prepare('UPDATE settings SET qr_image_path = ? WHERE id = 1').run(req.file.filename);
  res.json({ ok: true, qrImageUrl: `/uploads/qr/${req.file.filename}` });
});

module.exports = router;
