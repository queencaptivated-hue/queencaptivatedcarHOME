const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { newId } = require('../utils');
const { signToken } = require('../middleware/auth');

const router = express.Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'executive@queencaptivated.in').toLowerCase();

function isEmail(v) { return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function publicCustomer(c) { return { id: c.id, name: c.name, email: c.email, phone: c.phone }; }
function publicLandlord(l) {
  return { id: l.id, name: l.name, email: l.email, phone: l.phone, walletBalance: l.wallet_balance, status: l.status };
}

/* ---------------- customer ---------------- */
router.post('/customer/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !isEmail(email) || !phone || !password || password.length < 4) {
    return res.status(400).json({ error: 'Please provide a valid name, email, phone and a password of at least 4 characters.' });
  }
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = newId('customer');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO customers (id, name, email, phone, password_hash, created_at) VALUES (?,?,?,?,?,?)')
    .run(id, name, email.toLowerCase(), phone, hash, Date.now());
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  const token = signToken({ id, role: 'customer' });
  res.status(201).json({ token, user: publicCustomer(customer) });
});

router.post('/customer/login', (req, res) => {
  const { email, password } = req.body;
  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get((email || '').toLowerCase());
  if (!customer || !bcrypt.compareSync(password || '', customer.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = signToken({ id: customer.id, role: 'customer' });
  res.json({ token, user: publicCustomer(customer) });
});

/* ---------------- landlord ---------------- */
router.post('/landlord/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !isEmail(email) || !phone || !password || password.length < 4) {
    return res.status(400).json({ error: 'Please provide a valid name, email, phone and a password of at least 4 characters.' });
  }
  const existing = db.prepare('SELECT id FROM landlords WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = newId('landlord');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO landlords (id, name, email, phone, password_hash, wallet_balance, status, created_at) VALUES (?,?,?,?,?,0,\'active\',?)')
    .run(id, name, email.toLowerCase(), phone, hash, Date.now());
  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(id);
  const token = signToken({ id, role: 'landlord' });
  res.status(201).json({ token, user: publicLandlord(landlord) });
});

router.post('/landlord/login', (req, res) => {
  const { email, password } = req.body;
  const landlord = db.prepare('SELECT * FROM landlords WHERE email = ?').get((email || '').toLowerCase());
  if (!landlord || !bcrypt.compareSync(password || '', landlord.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (landlord.status === 'blocked') return res.status(403).json({ error: 'Your host account has been disabled. Contact the platform admin.' });
  const token = signToken({ id: landlord.id, role: 'landlord' });
  res.json({ token, user: publicLandlord(landlord) });
});

/* ---------------- admin ---------------- */
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if ((email || '').toLowerCase() !== ADMIN_EMAIL) {
    return res.status(401).json({ error: 'Incorrect admin credentials.' });
  }
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!bcrypt.compareSync(password || '', settings.admin_password_hash)) {
    return res.status(401).json({ error: 'Incorrect admin credentials.' });
  }
  const token = signToken({ id: 'admin', role: 'admin' });
  res.json({ token, user: { id: 'admin', name: 'Admin', email: ADMIN_EMAIL } });
});

module.exports = router;
