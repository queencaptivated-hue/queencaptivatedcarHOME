import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert } from "../../components/ui";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState([]);
  const [msg, setMsg] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newAllowed, setNewAllowed] = useState(true);
  const [newReason, setNewReason] = useState("");

  async function load() {
    const [s, r] = await Promise.all([client.get("/admin/settings"), client.get("/admin/eligibility-rules")]);
    setSettings(s.data);
    setRules(r.data);
  }
  useEffect(() => { load(); }, []);

  async function saveSettings(e) {
    e.preventDefault();
    await client.put("/admin/settings", settings);
    setMsg("Settings saved.");
    load();
  }

  function handleQrUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings((s) => ({ ...s, company_qr_code: reader.result }));
    reader.readAsDataURL(file);
  }

  async function addRule(e) {
    e.preventDefault();
    await client.put("/admin/eligibility-rules", { model_name: newModel, allowed: newAllowed, reason: newReason });
    setNewModel("");
    setNewReason("");
    load();
  }

  async function removeRule(model) {
    await client.delete(`/admin/eligibility-rules/${model}`);
    load();
  }

  if (!settings) return <div className="text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Configuration" title="Company settings" />
      {msg && <div className="mb-6"><Alert type="success">{msg}</Alert></div>}

      <form onSubmit={saveSettings} className="card p-6 space-y-4 mb-8">
        <div className="label-eyebrow">Commission & payment details</div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Commission percentage</label>
          <input type="number" step="0.1" className="input-field" value={settings.commission_percent} onChange={(e) => setSettings({ ...settings, commission_percent: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">UPI ID</label>
          <input className="input-field" value={settings.upi_id || ""} onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Bank name</label>
            <input className="input-field" value={settings.bank_name || ""} onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">IFSC</label>
            <input className="input-field" value={settings.bank_ifsc || ""} onChange={(e) => setSettings({ ...settings, bank_ifsc: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Account name</label>
            <input className="input-field" value={settings.bank_account_name || ""} onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Account number</label>
            <input className="input-field" value={settings.bank_account_number || ""} onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Company QR code</label>
          {settings.company_qr_code && <img src={settings.company_qr_code} alt="QR" className="h-24 w-24 object-contain mb-2 rounded-lg border border-hairline" />}
          <label className="btn-ghost text-xs cursor-pointer inline-block">
            Upload QR image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQrUpload(e.target.files[0])} />
          </label>
        </div>
        <button className="btn-gold">Save settings</button>
      </form>

      <div className="card p-6">
        <div className="label-eyebrow mb-4">Vehicle eligibility rules</div>
        <form onSubmit={addRule} className="grid sm:grid-cols-4 gap-3 mb-6">
          <input className="input-field" placeholder="Model name" value={newModel} onChange={(e) => setNewModel(e.target.value)} required />
          <select className="input-field" value={newAllowed} onChange={(e) => setNewAllowed(e.target.value === "true")}>
            <option value="true">Allowed</option>
            <option value="false">Rejected</option>
          </select>
          <input className="input-field" placeholder="Reason (if rejected)" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
          <button className="btn-gold">Add / update</button>
        </form>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rules.map((r) => (
            <div key={r.model_name} className="flex items-center justify-between text-sm border-b border-hairline pb-2 last:border-0">
              <span className="capitalize text-ivory">{r.model_name}</span>
              <div className="flex items-center gap-3">
                <span className={r.allowed ? "text-sage" : "text-garnet"}>{r.allowed ? "Allowed" : "Rejected"}</span>
                <button onClick={() => removeRule(r.model_name)} className="text-xs text-muted hover:text-garnet">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
