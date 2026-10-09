const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get((email || '').toLowerCase());
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = signToken({ id: admin.id, role: 'admin' });
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

router.put('/password', require('../middleware/auth').attachUser, require('../middleware/auth').requireAdmin, (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
