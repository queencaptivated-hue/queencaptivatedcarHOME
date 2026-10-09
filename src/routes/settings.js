const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const s = db.prepare('SELECT commission_rate, qr_image_path FROM settings WHERE id = 1').get();
  res.json({
    commissionRate: s.commission_rate,
    qrImageUrl: s.qr_image_path ? `/uploads/qr/${s.qr_image_path}` : null,
  });
});

module.exports = router;
