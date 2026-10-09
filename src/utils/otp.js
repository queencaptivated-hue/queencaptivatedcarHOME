import { db } from "../db/index.js";
import { v4 as uuid } from "uuid";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends an OTP SMS. Currently MOCKED — logs to console and (in dev mode)
 * returns the code to the caller so the API response can include it for
 * easy testing without a real SMS account.
 *
 * TO GO LIVE: replace the body of this function with a call to your SMS
 * provider (e.g. MSG91, Twilio, Fast2SMS) using SMS_PROVIDER_API_KEY from
 * .env, and set OTP_MODE=live so the code is no longer echoed in the API response.
 */
export function issueOtp(mobile, purpose = "login") {
  const code = generateCode();
  const id = uuid();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO otps (id, mobile, code, purpose, expires_at) VALUES (?,?,?,?,?)"
  ).run(id, mobile, code, purpose, expiresAt);

  // MOCK SEND — replace with real SMS provider call:
  console.log(`[MOCK SMS] OTP for ${mobile} (${purpose}): ${code} (expires in 5 min)`);

  return {
    sent: true,
    devOtp: process.env.OTP_MODE !== "live" ? code : undefined,
  };
}

export function verifyOtp(mobile, code, purpose = "login") {
  const row = db
    .prepare(
      `SELECT * FROM otps WHERE mobile = ? AND purpose = ? AND consumed = 0
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(mobile, purpose);

  if (!row) return { valid: false, reason: "No OTP requested for this number." };
  if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "OTP expired." };
  if (row.code !== String(code)) return { valid: false, reason: "Incorrect OTP." };

  db.prepare("UPDATE otps SET consumed = 1 WHERE id = ?").run(row.id);
  return { valid: true };
}
