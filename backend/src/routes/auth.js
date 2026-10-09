import { Router } from "express";
import { db } from "../db/index.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { issueOtp, verifyOtp } from "../utils/otp.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, mobile: user.mobile, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ── Request OTP (registration or login) ────────────────
router.post("/otp/request", (req, res) => {
  const { mobile, purpose = "login" } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
  }
  const result = issueOtp(mobile, purpose);
  res.json({ message: "OTP sent.", ...result });
});

// ── Register (Driver or Passenger) via mobile + OTP ────
router.post("/register", (req, res) => {
  const { mobile, otp, name, role } = req.body;
  if (!["driver", "passenger"].includes(role)) {
    return res.status(400).json({ error: "Role must be driver or passenger." });
  }
  const check = verifyOtp(mobile, otp, "register");
  if (!check.valid) return res.status(400).json({ error: check.reason });

  const existing = db.prepare("SELECT * FROM users WHERE mobile = ?").get(mobile);
  if (existing) return res.status(409).json({ error: "An account with this mobile number already exists." });

  const id = uuid();
  const status = role === "driver" ? "pending" : "active";
  db.prepare(
    "INSERT INTO users (id, role, mobile, name, status) VALUES (?,?,?,?,?)"
  ).run(id, role, mobile, name || null, status);

  if (role === "driver") {
    db.prepare("INSERT INTO drivers (user_id) VALUES (?)").run(id);
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
});

// ── Login: Passenger/Driver via mobile + OTP ────────────
router.post("/login/otp", (req, res) => {
  const { mobile, otp } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE mobile = ?").get(mobile);
  if (!user) return res.status(404).json({ error: "No account found for this mobile number." });
  if (user.status === "blocked") return res.status(403).json({ error: "This account has been blocked." });

  const check = verifyOtp(mobile, otp, "login");
  if (!check.valid) return res.status(400).json({ error: check.reason });

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

// ── Login: Super Admin via mobile + password + OTP (2FA) ─
router.post("/login/admin/password", (req, res) => {
  const { mobile, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE mobile = ? AND role = 'super_admin'").get(mobile);
  if (!user || !user.password_hash) return res.status(404).json({ error: "Admin account not found." });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  const result = issueOtp(mobile, "admin_2fa");
  res.json({ message: "Password verified. OTP sent for 2-factor verification.", ...result });
});

router.post("/login/admin/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE mobile = ? AND role = 'super_admin'").get(mobile);
  if (!user) return res.status(404).json({ error: "Admin account not found." });
  const check = verifyOtp(mobile, otp, "admin_2fa");
  if (!check.valid) return res.status(400).json({ error: check.reason });
  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

function sanitize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

export default router;
