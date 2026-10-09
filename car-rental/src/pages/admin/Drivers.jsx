import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Badge, Alert, EmptyState } from "../../components/ui";
import { rupees } from "../../utils/format";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regName, setRegName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await client.get("/admin/drivers", { params: filter ? { status: filter } : {} });
    setDrivers(data);
  }
  useEffect(() => { load(); }, [filter]);

  async function act(id, action) {
    setError("");
    try {
      await client.post(`/admin/drivers/${id}/${action}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Action failed.");
    }
  }

  async function registerDriver(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await client.post("/admin/drivers/register", { mobile: regMobile, name: regName });
      setMsg("Driver registered. They can now log in with OTP to complete setup.");
      setRegMobile("");
      setRegName("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not register driver.");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Fleet" title="Drivers" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

      <div className="card p-6 mb-8">
        <div className="label-eyebrow mb-4">Register a driver directly</div>
        <form onSubmit={registerDriver} className="grid sm:grid-cols-3 gap-4">
          <input className="input-field" placeholder="Mobile number" value={regMobile} onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} required />
          <input className="input-field" placeholder="Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
          <button className="btn-gold">Register driver</button>
        </form>
      </div>

      <div className="flex gap-2 mb-5">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${filter === s ? "border-gold text-gold" : "border-hairline text-muted"}`}>
            {s || "all"}
          </button>
        ))}
      </div>

      {drivers.length === 0 ? (
        <EmptyState text="No drivers match this filter." />
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => (
            <div key={d.user_id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-ivory font-medium">{d.name || "Unnamed"}</div>
                <div className="text-xs text-muted mt-1">{d.mobile} · Wallet: {rupees(d.wallet_balance_paise)} · ★ {d.rating_avg}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge status={d.approval_status} />
                <Badge status={d.account_status} />
                {d.approval_status === "pending" && (
                  <>
                    <button onClick={() => act(d.user_id, "approve")} className="btn-gold text-xs !px-3 !py-1.5">Approve</button>
                    <button onClick={() => act(d.user_id, "reject")} className="btn-ghost text-xs !px-3 !py-1.5 text-garnet border-garnet/40">Reject</button>
                  </>
                )}
                {d.account_status === "active" && d.approval_status === "approved" && (
                  <>
                    <button onClick={() => act(d.user_id, "suspend")} className="btn-ghost text-xs !px-3 !py-1.5">Suspend</button>
                    <button onClick={() => act(d.user_id, "block")} className="btn-ghost text-xs !px-3 !py-1.5 text-garnet border-garnet/40">Block</button>
                  </>
                )}
                {["suspended", "blocked"].includes(d.account_status) && (
                  <button onClick={() => act(d.user_id, "reactivate")} className="btn-gold text-xs !px-3 !py-1.5">Reactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
