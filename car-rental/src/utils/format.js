export function rupees(paise) {
  if (paise === null || paise === undefined) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function dateTime(str) {
  if (!str) return "—";
  return new Date(str.replace(" ", "T") + "Z").toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const STATUS_COLORS = {
  pending: "text-gold bg-gold/10 border-gold/30",
  approved: "text-sage bg-sage/10 border-sage/30",
  active: "text-sage bg-sage/10 border-sage/30",
  rejected: "text-garnet bg-garnet/10 border-garnet/30",
  blocked: "text-garnet bg-garnet/10 border-garnet/30",
  suspended: "text-gold bg-gold/10 border-gold/30",
  searching: "text-gold bg-gold/10 border-gold/30",
  accepted: "text-sage bg-sage/10 border-sage/30",
  ongoing: "text-sage bg-sage/10 border-sage/30",
  completed: "text-muted bg-white/5 border-hairline",
  cancelled: "text-garnet bg-garnet/10 border-garnet/30",
};
