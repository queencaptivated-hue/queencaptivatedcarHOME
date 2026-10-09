import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert, StatCard } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [payMethod, setPayMethod] = useState("upi");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [settings, setSettings] = useState(null);

  async function load() {
    const [w, d] = await Promise.all([client.get("/driver/wallet"), client.get("/driver/me")]);
    setWallet(w.data);
    setDriver(d.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleOnline() {
    setError("");
    setMsg("");
    try {
      if (driver.is_online) {
        await client.post("/driver/status/offline");
      } else {
        await client.post("/driver/status/online");
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await client.post("/driver/wallet/pay-commission", {
        amount_paise: Math.round(Number(payAmount) * 100),
        method: payMethod,
        reference_note: payNote,
      });
      setMsg("Payment submitted. It will reflect once the admin verifies it.");
      setPayAmount("");
      setPayNote("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    }
  }

  if (!wallet || !driver) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Commission & earnings"
        action={
          driver.approval_status === "approved" ? (
            <button onClick={toggleOnline} disabled={!wallet.can_accept_rides && !driver.is_online} className={`btn-gold ${!wallet.can_accept_rides && !driver.is_online ? "opacity-40 cursor-not-allowed" : ""}`}>
              {driver.is_online ? "Go offline" : "Go online"}
            </button>
          ) : null
        }
      />

      {driver.approval_status !== "approved" && (
        <div className="mb-6"><Alert type="info">Your driver profile is {driver.approval_status}. You'll be able to go online once approved by the admin.</Alert></div>
      )}
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}
      {msg && <div className="mb-6"><Alert type="success">{msg}</Alert></div>}
      {wallet.blocking_message && (
        <div className="mb-6"><Alert>{wallet.blocking_message}</Alert></div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Wallet balance"
          value={<span className={wallet.balance_paise < 0 ? "text-garnet" : "text-gold"}>{rupees(wallet.balance_paise)}</span>}
          sub={wallet.balance_paise < 0 ? "You owe this to the company" : "You're all clear"}
        />
        <StatCard label="Status" value={driver.is_online ? "Online" : "Offline"} sub={driver.approval_status} />
        <StatCard label="Rating" value={`★ ${driver.rating_avg}`} sub={`${driver.rating_count} rides rated`} />
      </div>

      {wallet.balance_paise < 0 && (
        <div className="card p-6 mb-8">
          <div className="label-eyebrow mb-4">Clear pending commission</div>
          <form onSubmit={submitPayment} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Amount (₹)</label>
              <input className="input-field" type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Payment method</label>
              <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="upi">UPI / QR code</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash to office</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted mb-1.5 block">Reference / UTR note</label>
              <input className="input-field" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="e.g. UPI transaction ID" />
            </div>
            <button className="btn-gold sm:col-span-2">Submit payment for verification</button>
          </form>
        </div>
      )}

      <div className="card p-6">
        <div className="label-eyebrow mb-4">Recent transactions</div>
        {wallet.transactions.length === 0 ? (
          <div className="text-muted text-sm">No transactions yet.</div>
        ) : (
          <div className="space-y-3">
            {wallet.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-hairline pb-3 last:border-0">
                <div>
                  <div className="text-sm text-ivory capitalize">{t.type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted">{dateTime(t.created_at)} {t.note ? `· ${t.note}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${t.amount_paise < 0 ? "text-garnet" : "text-sage"}`}>
                    {t.amount_paise < 0 ? "-" : "+"}{rupees(Math.abs(t.amount_paise))}
                  </div>
                  {t.type === "commission_payment" && !t.verified_by_admin && (
                    <div className="text-[10px] text-gold uppercase tracking-wider">Pending verification</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
