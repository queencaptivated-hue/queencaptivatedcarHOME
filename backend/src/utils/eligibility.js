import { db } from "../db/index.js";

/**
 * Checks a vehicle model name against the ground-clearance eligibility list.
 * Admin can edit this list via /api/admin/eligibility-rules.
 */
export function checkVehicleEligibility(modelName) {
  const normalized = (modelName || "").trim().toLowerCase();
  const exact = db.prepare("SELECT * FROM vehicle_eligibility_rules WHERE model_name = ?").get(normalized);
  if (exact) {
    return exact.allowed
      ? { allowed: true }
      : { allowed: false, reason: exact.reason || "Vehicle rejected due to insufficient ground clearance for local terrain." };
  }
  // Fuzzy partial match against known rejected keywords
  const rejectedRules = db.prepare("SELECT * FROM vehicle_eligibility_rules WHERE allowed = 0").all();
  for (const rule of rejectedRules) {
    if (normalized.includes(rule.model_name)) {
      return { allowed: false, reason: rule.reason || "Vehicle rejected due to insufficient ground clearance for local terrain." };
    }
  }
  // Unknown model: default to manual admin review rather than auto-approve
  return { allowed: null, reason: "Model not recognized — requires manual admin review." };
}
