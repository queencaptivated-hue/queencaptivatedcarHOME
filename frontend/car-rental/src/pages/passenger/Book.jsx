import { useState, useEffect } from "react";
import client from "../../api/client";
import { PageHeader, Alert } from "../../components/ui";
import { rupees } from "../../utils/format";
import { useNavigate } from "react-router-dom";

const TRIP_TYPES = [
  { id: "one_way", label: "One-way trip" },
  { id: "round_trip", label: "Round trip" },
  { id: "village_to_village", label: "Village-to-village" },
  { id: "airport_pickup", label: "Airport pickup" },
];

// Reference points around Imphal, Manipur for demo coordinate selection
const PLACES = [
  { label: "Imphal (City Centre)", lat: 24.817, lng: 93.9368 },
  { label: "Bishnupur", lat: 24.6333, lng: 93.7667 },
  { label: "Thoubal", lat: 24.6333, lng: 94.0167 },
  { label: "Churachandpur", lat: 24.3333, lng: 93.6833 },
  { label: "Imphal Airport", lat: 24.76, lng: 93.8967 },
  { label: "Kakching", lat: 24.4954, lng: 93.9814 },
];

export default function Book() {
  const [tripType, setTripType] = useState("one_way");
  const [category, setCategory] = useState("category_1");
  const [pricing, setPricing] = useState(null);
  const [pickup, setPickup] = useState(PLACES[0]);
  const [drop, setDrop] = useState(PLACES[1]);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/passenger/pricing").then((res) => setPricing(res.data));
  }, []);

  useEffect(() => {
    if (!pickup || !drop) return;
    setError("");
    setLoading(true);
    const t = setTimeout(() => {
      client
        .post("/passenger/fare-estimate", {
          trip_type: tripType,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: drop.lat,
          drop_lng: drop.lng,
          category,
        })
        .then((res) => setEstimate(res.data))
        .catch((err) => setError(err.response?.data?.error || "Could not estimate fare."))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [tripType, category, pickup, drop]);

  async function confirmBooking() {
    setBooking(true);
    setError("");
    try {
      const { data } = await client.post("/passenger/bookings", {
        trip_type: tripType,
        pickup_label: pickup.label,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        drop_label: drop.label,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        category,
      });
      navigate(`/passenger/rides/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create booking.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Book a ride" title="Where are you headed?" />
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="label-eyebrow mb-3">Trip type</div>
            <div className="grid grid-cols-2 gap-2">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTripType(t.id)}
                  className={`text-sm text-left px-4 py-3 rounded-lg border transition-colors ${
                    tripType === t.id ? "border-gold bg-gold/10 text-gold" : "border-hairline text-muted hover:text-ivory"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Pickup</label>
              <select className="input-field" value={pickup.label} onChange={(e) => setPickup(PLACES.find((p) => p.label === e.target.value))}>
                {PLACES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Destination</label>
              <select className="input-field" value={drop.label} onChange={(e) => setDrop(PLACES.find((p) => p.label === e.target.value))}>
                {PLACES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {tripType !== "village_to_village" && (
            <div className="card p-6">
              <div className="label-eyebrow mb-3">Vehicle category</div>
              <div className="space-y-2">
                {pricing?.categories.map((c) => (
                  <button
                    key={c.category}
                    onClick={() => setCategory(c.category)}
                    className={`w-full text-left px-4 py-3 rounded-lg border flex items-center justify-between transition-colors ${
                      category === c.category ? "border-gold bg-gold/10" : "border-hairline hover:border-gold/40"
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-medium ${category === c.category ? "text-gold" : "text-ivory"}`}>{c.label}</div>
                    </div>
                    <div className="text-xs text-muted">{rupees(c.min_rate_paise)} – {rupees(c.max_rate_paise)}/day</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 h-fit sticky top-6">
          <div className="label-eyebrow mb-4">Fare estimate</div>
          {loading ? (
            <div className="text-muted text-sm">Calculating…</div>
          ) : estimate ? (
            <>
              <div className="font-display text-4xl text-gold mb-1">{rupees(estimate.fare_paise)}</div>
              <div className="text-xs text-muted mb-6">{estimate.distance_km} km · ~{estimate.eta_minutes} min ETA</div>
              <div className="space-y-2 text-sm text-muted mb-6">
                <div className="flex justify-between"><span>Pickup</span><span className="text-ivory">{pickup.label}</span></div>
                <div className="flex justify-between"><span>Drop</span><span className="text-ivory">{drop.label}</span></div>
              </div>
              <button onClick={confirmBooking} disabled={booking} className="btn-gold w-full">
                {booking ? "Booking…" : "Confirm booking"}
              </button>
            </>
          ) : (
            <div className="text-muted text-sm">Select pickup and drop to see fare.</div>
          )}
        </div>
      </div>
    </div>
  );
}
