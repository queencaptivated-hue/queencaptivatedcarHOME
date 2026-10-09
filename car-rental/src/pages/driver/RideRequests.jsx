import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert, EmptyState } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function RideRequests() {
  const [requests, setRequests] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const [reqs, history] = await Promise.all([
      client.get("/driver/rides/requests"),
      client.get("/driver/rides/history"),
    ]);
    setRequests(reqs.data);
    const ongoing = history.data.find((r) => ["accepted", "ongoing"].includes(r.status));
    setActive(ongoing || null);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function accept(id) {
    setError("");
    try {
      await client.post(`/driver/rides/${id}/accept`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not accept ride.");
    }
  }

  async function start(id) {
    await client.post(`/driver/rides/${id}/start`);
    load();
  }

  async function complete(id, method) {
    await client.post(`/driver/rides/${id}/complete`, { payment_method: method });
    load();
  }

  return (
    <div>
      <PageHeader eyebrow="Live" title="Ride requests" />
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}

      {active && (
        <div className="card p-6 mb-8 border-gold/40">
          <div className="label-eyebrow mb-3">Your active ride</div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-ivory font-medium">{active.pickup_label} → {active.drop_label}</div>
              <div className="text-xs text-muted mt-1">Fare {rupees(active.fare_paise)} · Ask passenger for OTP: <span className="text-gold font-semibold">must match {active.otp_code}</span></div>
            </div>
            <div className="flex gap-2">
              {active.status === "accepted" && (
                <button onClick={() => start(active.id)} className="btn-gold text-sm">Start ride</button>
              )}
              {active.status === "ongoing" && <CompleteButtons id={active.id} onComplete={complete} />}
            </div>
          </div>
        </div>
      )}

      <div className="label-eyebrow mb-4">Nearby requests</div>
      {requests.length === 0 ? (
        <EmptyState text="New booking requests will appear here when you're online." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-ivory font-medium">{r.pickup_label} → {r.drop_label}</div>
                <div className="text-xs text-muted mt-1">{r.trip_type?.replace(/_/g, " ")} · {r.distance_km} km · {dateTime(r.requested_at)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-gold font-display text-xl">{rupees(r.fare_paise)}</div>
                <button onClick={() => accept(r.id)} disabled={!!active} className={`btn-gold text-sm ${active ? "opacity-40 cursor-not-allowed" : ""}`}>Accept</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompleteButtons({ id, onComplete }) {
  const [method, setMethod] = useState("cash");
  return (
    <div className="flex items-center gap-2">
      <select className="input-field !py-1.5 !w-auto text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Cash</option>
        <option value="gpay">Google Pay</option>
        <option value="phonepe">PhonePe</option>
        <option value="upi">UPI</option>
      </select>
      <button onClick={() => onComplete(id, method)} className="btn-gold text-sm">Complete ride</button>
    </div>
  );
}
