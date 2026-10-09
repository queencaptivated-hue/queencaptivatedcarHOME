const express = require('express');
const db = require('../db');
const { newId } = require('../utils');
const { attachUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Features are stored as newline-separated text, exposed as an array.
function featuresToArray(text) {
  return String(text || '').split('\n').map((x) => x.trim()).filter(Boolean);
}
function featuresToText(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean).join('\n');
  return String(value || '').split('\n').map((x) => x.trim()).filter(Boolean).join('\n');
}

function toPublic(p) {
  return {
    id: p.id,
    name: p.name,
    shortDescription: p.short_description,
    fullDescription: p.full_description,
    imageUrl: p.image_url,
    iconUrl: p.icon_url,
    productUrl: p.product_url,
    category: p.category,
    status: p.status,
    ctaText: p.cta_text,
    features: featuresToArray(p.features),
    featured: !!p.featured,
    sortOrder: p.sort_order,
  };
}
function toAdmin(p) {
  return { ...toPublic(p), published: !!p.published, createdAt: p.created_at, updatedAt: p.updated_at };
}

function validate(body, { partial } = { partial: false }) {
  const errors = [];
  const req = (key) => {
    if (!partial && (body[key] === undefined || body[key] === null || String(body[key]).trim() === '')) {
      errors.push(`${key} is required.`);
    }
  };
  req('name');
  if (body.status && !['Available', 'Coming Soon', 'Beta'].includes(body.status)) {
    errors.push('status must be Available, Coming Soon, or Beta.');
  }
  // Links must be http(s) or site-relative; images may also be small uploaded data URLs.
  const link = /^(https?:\/\/|\/)/i;
  const image = /^(https?:\/\/|\/|data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,)/i;
  ['productUrl'].forEach((k) => {
    if (body[k] && !link.test(String(body[k]).trim())) errors.push(`${k} must start with http://, https:// or /.`);
  });
  ['imageUrl', 'iconUrl'].forEach((k) => {
    if (body[k]) {
      const v = String(body[k]).trim();
      if (!image.test(v)) errors.push(`${k} must be an http(s) link or an uploaded image.`);
      if (v.length > 900000) errors.push(`${k} is too large — use a smaller image.`);
    }
  });
  return errors;
}

// ---------- Public ----------
// Only published products, featured first, then by sort_order.
router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM products WHERE published = 1 ORDER BY featured DESC, sort_order ASC, created_at ASC`
  ).all();
  res.json(rows.map(toPublic));
});

// ---------- Admin ----------
router.get('/admin', attachUser, requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM products ORDER BY sort_order ASC, created_at ASC`).all();
  res.json(rows.map(toAdmin));
});

router.post('/admin', attachUser, requireAdmin, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const b = req.body;
  const id = newId('product');
  const now = Date.now();
  db.prepare(`
    INSERT INTO products
      (id, name, short_description, full_description, image_url, icon_url, product_url,
       category, status, cta_text, features, published, featured, sort_order, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, b.name, b.shortDescription || '', b.fullDescription || '', b.imageUrl || '', b.iconUrl || '',
    b.productUrl || '', b.category || '', b.status || 'Coming Soon', b.ctaText || 'Learn More',
    featuresToText(b.features),
    b.published === false ? 0 : 1, b.featured ? 1 : 0, Number.isFinite(b.sortOrder) ? b.sortOrder : 0,
    now, now
  );
  res.status(201).json(toAdmin(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
});

router.put('/admin/:id', attachUser, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const errors = validate(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const b = req.body;
  const merged = {
    name: b.name ?? existing.name,
    short_description: b.shortDescription ?? existing.short_description,
    full_description: b.fullDescription ?? existing.full_description,
    image_url: b.imageUrl ?? existing.image_url,
    icon_url: b.iconUrl ?? existing.icon_url,
    product_url: b.productUrl ?? existing.product_url,
    category: b.category ?? existing.category,
    status: b.status ?? existing.status,
    cta_text: b.ctaText ?? existing.cta_text,
    features: b.features === undefined ? existing.features : featuresToText(b.features),
    published: b.published === undefined ? existing.published : (b.published ? 1 : 0),
    featured: b.featured === undefined ? existing.featured : (b.featured ? 1 : 0),
    sort_order: Number.isFinite(b.sortOrder) ? b.sortOrder : existing.sort_order,
  };
  db.prepare(`
    UPDATE products SET name=?, short_description=?, full_description=?, image_url=?, icon_url=?,
      product_url=?, category=?, status=?, cta_text=?, features=?, published=?, featured=?, sort_order=?, updated_at=?
    WHERE id = ?
  `).run(
    merged.name, merged.short_description, merged.full_description, merged.image_url, merged.icon_url,
    merged.product_url, merged.category, merged.status, merged.cta_text, merged.features, merged.published, merged.featured,
    merged.sort_order, Date.now(), req.params.id
  );
  res.json(toAdmin(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
});

router.delete('/admin/:id', attachUser, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ok: true });
});

module.exports = router;
