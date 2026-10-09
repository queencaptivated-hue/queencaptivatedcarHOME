const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { newId, uploadRoomPhotos, ROOM_DIR } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const MAX_PHOTOS = 10;

function photosForRoom(roomId) {
  return db.prepare('SELECT id, file_path FROM room_photos WHERE room_id = ? ORDER BY sort_order ASC').all(roomId)
    .map(p => `/uploads/rooms/${path.basename(p.file_path)}`);
}

function photosWithIdsForRoom(roomId) {
  return db.prepare('SELECT id, file_path FROM room_photos WHERE room_id = ? ORDER BY sort_order ASC').all(roomId)
    .map(p => ({ id: p.id, url: `/uploads/rooms/${path.basename(p.file_path)}` }));
}

function isBookable(landlord) {
  return !!landlord && landlord.status !== 'blocked' && landlord.wallet_balance >= 0;
}

// Public shape: never includes landlord email/phone.
function publicRoom(room, landlord) {
  return {
    id: room.id,
    title: room.title,
    location: room.location,
    description: room.description,
    price: room.price,
    maxGuests: room.max_guests,
    active: !!room.active,
    hostName: landlord ? landlord.name : 'Host',
    bookable: isBookable(landlord) && !!room.active,
    photos: photosForRoom(room.id),
  };
}

/* ---------------- public ---------------- */
router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms WHERE active = 1 ORDER BY created_at DESC').all();
  const out = rooms.map(r => {
    const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(r.landlord_id);
    return publicRoom(r, landlord);
  });
  res.json(out);
});

router.get('/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Listing not found.' });
  const landlord = db.prepare('SELECT * FROM landlords WHERE id = ?').get(room.landlord_id);
  res.json(publicRoom(room, landlord));
});

/* ---------------- landlord ---------------- */
router.get('/mine/list', requireAuth('landlord'), (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms WHERE landlord_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rooms.map(r => ({
    id: r.id, title: r.title, location: r.location, description: r.description,
    price: r.price, maxGuests: r.max_guests, active: !!r.active, photos: photosWithIdsForRoom(r.id),
  })));
});

router.post('/', requireAuth('landlord'), uploadRoomPhotos.array('photos', MAX_PHOTOS), (req, res) => {
  const { title, location, description, price, maxGuests } = req.body;
  if (!title || !location || !description || !price || !maxGuests) {
    return res.status(400).json({ error: 'Title, location, description, price and max guests are all required.' });
  }
  const id = newId('room');
  db.prepare(`INSERT INTO rooms (id, landlord_id, title, location, description, price, max_guests, active, created_at)
              VALUES (?,?,?,?,?,?,?,1,?)`)
    .run(id, req.user.id, title, location, description, Number(price), Number(maxGuests), Date.now());

  (req.files || []).slice(0, MAX_PHOTOS).forEach((f, i) => {
    db.prepare('INSERT INTO room_photos (id, room_id, file_path, sort_order) VALUES (?,?,?,?)')
      .run(newId('photo'), id, f.filename, i);
  });
  res.status(201).json({ id });
});

router.put('/:id', requireAuth('landlord'), uploadRoomPhotos.array('photos', MAX_PHOTOS), (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Listing not found.' });
  if (room.landlord_id !== req.user.id) return res.status(403).json({ error: 'You do not own this listing.' });

  const { title, location, description, price, maxGuests, removePhotoIds } = req.body;
  db.prepare('UPDATE rooms SET title=?, location=?, description=?, price=?, max_guests=? WHERE id=?')
    .run(title || room.title, location || room.location, description || room.description,
         price ? Number(price) : room.price, maxGuests ? Number(maxGuests) : room.max_guests, room.id);

  // Remove photos the landlord deleted in the edit form.
  const toRemove = removePhotoIds ? JSON.parse(removePhotoIds) : [];
  toRemove.forEach(pid => {
    const p = db.prepare('SELECT * FROM room_photos WHERE id = ? AND room_id = ?').get(pid, room.id);
    if (p) {
      fs.unlink(path.join(ROOM_DIR, path.basename(p.file_path)), () => {});
      db.prepare('DELETE FROM room_photos WHERE id = ?').run(pid);
    }
  });

  const currentCount = db.prepare('SELECT COUNT(*) AS c FROM room_photos WHERE room_id = ?').get(room.id).c;
  const room_ids_allowed = Math.max(0, MAX_PHOTOS - currentCount);
  (req.files || []).slice(0, room_ids_allowed).forEach((f, i) => {
    db.prepare('INSERT INTO room_photos (id, room_id, file_path, sort_order) VALUES (?,?,?,?)')
      .run(newId('photo'), room.id, f.filename, currentCount + i);
  });

  res.json({ ok: true });
});

router.delete('/:id', requireAuth('landlord'), (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Listing not found.' });
  if (room.landlord_id !== req.user.id) return res.status(403).json({ error: 'You do not own this listing.' });

  const photos = db.prepare('SELECT * FROM room_photos WHERE room_id = ?').all(room.id);
  photos.forEach(p => fs.unlink(path.join(ROOM_DIR, path.basename(p.file_path)), () => {}));
  db.prepare('DELETE FROM rooms WHERE id = ?').run(room.id); // room_photos cascade
  res.json({ ok: true });
});

module.exports = router;
