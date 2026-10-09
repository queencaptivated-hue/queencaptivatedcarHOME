import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert, Badge, EmptyState } from "../../components/ui";

const CATEGORIES = [
  { id: "category_1", label: "Category 1 — High-clearance hatchback / compact crossover" },
  { id: "category_2", label: "Category 2 — Sedan / mid-size SUV" },
  { id: "category_3", label: "Category 3 — SUV / MPV" },
];

export default function Vehicle() {
  const [vehicles, setVehicles] = useState([]);
  const [model, setModel] = useState("");
  const [reg, setReg] = useState("");
  const [category, setCategory] = useState("category_1");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await client.get("/driver/vehicles");
    setVehicles(data);
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const { data } = await client.post("/driver/vehicles", { model_name: model, registration_no: reg, category });
      setMsg(data.message);
      setModel("");
      setReg("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit vehicle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Fleet" title="My vehicle" />

      <div className="card p-6 mb-8">
        <div className="label-eyebrow mb-4">Register a vehicle</div>
        <p className="text-xs text-muted mb-4">
          Only high-clearance vehicles are accepted (SUVs, MPVs, crossovers). Low-clearance
          cars like Alto, Alto K10, Maruti 800, Celerio, S-Presso, Eeco, and Omni are not eligible.
        </p>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Model name</label>
            <input className="input-field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Brezza" required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Registration number</label>
            <input className="input-field" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. MN01AB1234" required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Category</label>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <button className="btn-gold sm:col-span-3" disabled={loading}>{loading ? "Submitting…" : "Submit for approval"}</button>
        </form>
      </div>

      <div className="label-eyebrow mb-4">Submitted vehicles</div>
      {vehicles.length === 0 ? (
        <EmptyState text="Vehicles you register will appear here." />
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div key={v.id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-ivory font-medium">{v.model_name} · {v.registration_no}</div>
                <div className="text-xs text-muted mt-1 capitalize">{v.category?.replace("_", " ")}</div>
                {v.rejection_reason && <div className="text-xs text-garnet mt-1">{v.rejection_reason}</div>}
              </div>
              <Badge status={v.approval_status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
