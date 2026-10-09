const { customAlphabet } = require('nanoid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
function newId(prefix) {
  return `${prefix}_${nanoid()}`;
}

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const ROOM_DIR = path.join(UPLOAD_ROOT, 'rooms');
const QR_DIR = path.join(UPLOAD_ROOT, 'qr');
[UPLOAD_ROOT, ROOM_DIR, QR_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

function imageFileFilter(req, file, cb) {
  const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
  cb(ok ? null : new Error('Only JPG, PNG, WEBP or GIF images are allowed.'), ok);
}

const roomPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ROOM_DIR),
  filename: (req, file, cb) => cb(null, `${newId('photo')}${path.extname(file.originalname).toLowerCase()}`),
});
const uploadRoomPhotos = multer({
  storage: roomPhotoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 10 }, // 3MB per photo, max 10 files per request
});

const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QR_DIR),
  filename: (req, file, cb) => cb(null, `${newId('qr')}${path.extname(file.originalname).toLowerCase()}`),
});
const uploadQr = multer({
  storage: qrStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});

module.exports = { newId, uploadRoomPhotos, uploadQr, ROOM_DIR, QR_DIR, UPLOAD_ROOT };
