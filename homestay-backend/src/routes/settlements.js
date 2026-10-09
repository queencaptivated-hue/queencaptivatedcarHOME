const express = require('express');
const db = require('../db');
const { newId } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth('landlord'), (req, res) => {
  const { amount, note } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Enter a valid amount.' });
  const id = newId('settlement');
  db.prepare('INSERT INTO settlements (id, landlord_id, amount, note, status, created_at) VALUES (?,?,?,?,\'Pending\',?)')
    .run(id, req.user.id, Number(amount), note || null, Date.now());
  res.status(201).json({ id });
});

router.get('/mine', requireAuth('landlord'), (req, res) => {
  const rows = db.prepare('SELECT * FROM settlements WHERE landlord_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows.map(s => ({ id: s.id, amount: s.amount, note: s.note, status: s.status, createdAt: s.created_at })));
});

module.exports = router;
