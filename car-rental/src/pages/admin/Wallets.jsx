import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert, EmptyState } from "../../components/ui";
import { rupees, dateTime } from "../../utils/format";

export default function Wallets() {
  const [pending, setPending] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const [p, w] = await Promise.all([client.get("/admin/wallets/pending-payments"), client.get("/admin/wallets")]);
    setPending(p.data);
    setWallets(w.data);
  }
  useEffect(() => { load(); }, []);

  async function verify(id) {
    await client.post(`/admin/wallets/verify-payment/${id}`);
    setMsg("Payment verified and wallet updated.");
    load();
  }

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Wallets & commission" />
      {msg && <div className="mb-6"><Alert type="success">{msg}</Alert></div>}

      <div className="label-eyebrow mb-4">Pending commission payments</div>
      {pending.length === 0 ? (
        <EmptyState text="Driver commission payments awaiting verification will appear here." />
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map((tx) => (
            <div key={tx.id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-ivory font-medium">{tx.driver_name} · {tx.driver_mobile}</div>
                <div className="text-xs text-muted mt-1">{tx.note} · {dateTime(tx.created_at)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-gold font-display text-lg">{rupees(tx.amount_paise)}</div>
                <button onClick={() => verify(tx.id)} className="btn-gold text-sm">Verify & credit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="label-eyebrow mb-4">All driver wallets</div>
      <div className="card divide-y divide-hairline">
        {wallets.map((w) => (
          <div key={w.id} className="flex items-center justify-between px-5 py-3">
            <div className="text-sm text-ivory">{w.name} <span className="text-muted">· {w.mobile}</span></div>
            <div className={`font-medium ${w.wallet_balance_paise < 0 ? "text-garnet" : "text-sage"}`}>{rupees(w.wallet_balance_paise)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
