import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, StatCard } from "../../components/ui";
import { rupees } from "../../utils/format";

export default function Overview() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    client.get("/admin/reports/summary").then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <PageHeader eyebrow="Dashboard" title="Company overview" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total revenue" value={rupees(summary.revenue.total_fare_paise)} sub={`${summary.revenue.completed_rides} completed rides`} />
        <StatCard label="Commission earned" value={rupees(summary.revenue.total_commission_paise)} />
        <StatCard label="Pending commission" value={rupees(summary.pending_commission_paise)} sub="Owed by drivers" />
        <StatCard label="Passengers" value={summary.passengers.total} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Drivers" value={summary.drivers.total} sub={`${summary.drivers.approved} approved · ${summary.drivers.pending} pending`} />
        <StatCard label="Vehicles" value={summary.vehicles.total} sub={`${summary.vehicles.approved} approved`} />
        <StatCard label="Completed rides" value={summary.revenue.completed_rides} />
      </div>
    </div>
  );
}
