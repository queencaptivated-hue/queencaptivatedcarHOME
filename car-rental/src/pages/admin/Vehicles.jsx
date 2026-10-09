import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Badge, Alert, EmptyState } from "../../components/ui";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await client.get("/admin/vehicles", { params: filter ? { status: filter } : {} });
    setVehicles(data);
  }
  useEffect(() => { load(); }, [filter]);

  async function approve(id) {
    setError("");
    try {
      await client.post(`/admin/vehicles/${id}/approve`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Action failed.");
    }
  }

  async function reject(id) {
    await client.post(`/admin/vehicles/${id}/reject`, { reason });
    setRejectingId(null);
    setReason("");
    load();
  }

  return (
    <div>
      <PageHeader eyebrow="Fleet" title="Vehicle approvals" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="flex gap-2 mb-5">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${filter === s ? "border-gold text-gold" : "border-hairline text-muted"}`}>
            {s || "all"}
          </button>
        ))}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState text="No vehicles match this filter." />
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-ivory font-medium">{v.model_name} · {v.registration_no}</div>
                  <div className="text-xs text-muted mt-1 capitalize">{v.category?.replace("_", " ")} · {v.driver_name} ({v.driver_mobile})</div>
                  {v.rejection_reason && <div className="text-xs text-garnet mt-1">Rejected: {v.rejection_reason}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={v.approval_status} />
                  {v.approval_status === "pending" && (
                    <>
                      <button onClick={() => approve(v.id)} className="btn-gold text-xs !px-3 !py-1.5">Approve</button>
                      <button onClick={() => setRejectingId(rejectingId === v.id ? null : v.id)} className="btn-ghost text-xs !px-3 !py-1.5 text-garnet border-garnet/40">Reject</button>
                    </>
                  )}
                </div>
              </div>
              {rejectingId === v.id && (
                <div className="mt-4 flex gap-2">
                  <input className="input-field" placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <button onClick={() => reject(v.id)} className="btn-gold text-sm whitespace-nowrap">Confirm reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
