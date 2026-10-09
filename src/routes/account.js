const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth(), (req, res) => {
  if (req.user.role === 'landlord') {
    const l = db.prepare('SELECT * FROM landlords WHERE id = ?').get(req.user.id);
    if (!l) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ role: 'landlord', id: l.id, name: l.name, email: l.email, phone: l.phone, walletBalance: l.wallet_balance, status: l.status });
  }
  if (req.user.role === 'customer') {
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.user.id);
    if (!c) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ role: 'customer', id: c.id, name: c.name, email: c.email, phone: c.phone });
  }
  return res.json({ role: 'admin', id: 'admin', name: 'Admin' });
});

module.exports = router;
