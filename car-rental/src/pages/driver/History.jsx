import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Badge, EmptyState, StatCard } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function History() {
  const [rides, setRides] = useState([]);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    client.get("/driver/rides/history").then((res) => setRides(res.data));
    client.get("/driver/earnings").then((res) => setEarnings(res.data));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="History" title="Ride history & earnings" />

      {earnings && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Completed rides" value={earnings.completed_rides} />
          <StatCard label="Total earnings" value={rupees(earnings.total_earnings_paise)} />
          <StatCard label="Total commission paid" value={rupees(earnings.total_commission_paise)} />
        </div>
      )}

      {rides.length === 0 ? (
        <EmptyState text="Completed and past rides will appear here." />
      ) : (
        <div className="space-y-3">
          {rides.map((r) => (
            <div key={r.id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-ivory font-medium">{r.pickup_label} → {r.drop_label}</div>
                <div className="text-xs text-muted mt-1">{dateTime(r.requested_at)}</div>
              </div>
              <div className="text-right flex items-center gap-4">
                <Badge status={r.status} />
                <div className="text-gold font-display text-lg">{rupees(r.fare_paise)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
