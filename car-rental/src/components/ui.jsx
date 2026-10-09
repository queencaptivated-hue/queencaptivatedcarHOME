import { STATUS_COLORS } from "../utils/format";

export function Badge({ status }) {
  const cls = STATUS_COLORS[status] || "text-muted bg-white/5 border-hairline";
  return (
    <span className={`inline-flex items-center text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
      <div>
        {eyebrow && <div className="label-eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-3xl md:text-4xl text-ivory">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-muted mb-2">{label}</div>
      <div className="font-display text-3xl text-gold">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="text-center py-16 text-muted">
      <div className="font-display text-xl text-ivory/70 mb-1">Nothing here yet</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function Alert({ type = "error", children }) {
  const styles = {
    error: "border-garnet/40 bg-garnet/10 text-ivory",
    success: "border-sage/40 bg-sage/10 text-ivory",
    info: "border-gold/30 bg-gold/10 text-ivory",
  };
  return <div className={`border rounded-lg px-4 py-3 text-sm ${styles[type]}`}>{children}</div>;
}
