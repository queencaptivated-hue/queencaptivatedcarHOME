import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../../api/client";
import { PageHeader, Badge, Alert } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function RideDetail() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [error, setError] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);

  async function load() {
    try {
      const { data } = await client.get(`/passenger/bookings/${id}`);
      setRide(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load ride.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [id]);

  async function cancel() {
    await client.post(`/passenger/bookings/${id}/cancel`);
    load();
  }

  async function submitRating() {
    await client.post(`/passenger/bookings/${id}/rate`, { stars, comment });
    setRated(true);
  }

  if (error) return <Alert>{error}</Alert>;
  if (!ride) return <div className="text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Ride" title={ride.pickup_label + " → " + ride.drop_label} action={<Badge status={ride.status} />} />

      <div className="card p-6 space-y-4 mb-6">
        {ride.status === "searching" && <Alert type="info">Searching for a nearby driver…</Alert>}
        {ride.status === "accepted" && <Alert type="success">Driver assigned! Your ride OTP is <b>{ride.otp_code}</b> — share it with your driver at pickup.</Alert>}
        {ride.status === "ongoing" && <Alert type="success">Your ride is in progress.</Alert>}
        {ride.status === "completed" && <Alert type="success">Ride completed. Thanks for riding with Queen Captivated!</Alert>}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Trip type" value={ride.trip_type?.replace(/_/g, " ")} />
          <Info label="Distance" value={ride.distance_km ? `${ride.distance_km} km` : "—"} />
          <Info label="Fare" value={rupees(ride.fare_paise)} />
          <Info label="Requested" value={dateTime(ride.requested_at)} />
        </div>

        {ride.driver && (
          <div className="border-t border-hairline pt-4">
            <div className="label-eyebrow mb-2">Your driver</div>
            <div className="text-ivory">{ride.driver.name}</div>
            <div className="text-muted text-sm">{ride.driver.mobile} · ★ {ride.driver.rating_avg}</div>
          </div>
        )}

        {["searching", "accepted"].includes(ride.status) && (
          <button onClick={cancel} className="btn-ghost text-sm text-garnet border-garnet/40 hover:border-garnet">Cancel booking</button>
        )}
      </div>

      {ride.status === "completed" && !rated && (
        <div className="card p-6">
          <div className="label-eyebrow mb-3">Rate your ride</div>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setStars(s)} className={`text-2xl ${s <= stars ? "text-gold" : "text-hairline"}`}>★</button>
            ))}
          </div>
          <textarea className="input-field mb-4" rows={3} placeholder="Optional feedback" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button onClick={submitRating} className="btn-gold">Submit rating</button>
        </div>
      )}
      {rated && <Alert type="success">Thanks for your feedback!</Alert>}

      <Link to="/passenger/rides" className="text-sm text-gold hover:underline mt-6 inline-block">← Back to rides</Link>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      <div className="text-ivory capitalize">{value}</div>
    </div>
  );
}
