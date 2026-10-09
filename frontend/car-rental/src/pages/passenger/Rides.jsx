import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { PageHeader, Badge, EmptyState } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function Rides() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    client.get("/passenger/bookings").then((res) => setRides(res.data));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="History" title="My rides" />
      {rides.length === 0 ? (
        <EmptyState text="Your booked rides will appear here." />
      ) : (
        <div className="space-y-3">
          {rides.map((r) => (
            <Link key={r.id} to={`/passenger/rides/${r.id}`} className="card p-5 flex items-center justify-between hover:border-gold/40 transition-colors block">
              <div>
                <div className="text-ivory font-medium">{r.pickup_label} → {r.drop_label}</div>
                <div className="text-xs text-muted mt-1">{dateTime(r.requested_at)} · {r.trip_type?.replace(/_/g, " ")}</div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <Badge status={r.status} />
                <div className="text-gold font-display text-lg">{rupees(r.fare_paise)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
