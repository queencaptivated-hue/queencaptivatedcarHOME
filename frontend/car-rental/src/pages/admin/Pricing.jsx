import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert } from "../../components/ui";

export default function Pricing() {
  const [categories, setCategories] = useState([]);
  const [village, setVillage] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await client.get("/admin/pricing");
    setCategories(data.categories);
    setVillage(data.village);
  }
  useEffect(() => { load(); }, []);

  async function savePricing(cat, min, max) {
    await client.put(`/admin/pricing/${cat}`, { min_rate_paise: Math.round(min * 100), max_rate_paise: Math.round(max * 100) });
    setMsg(`${cat.replace("_", " ")} pricing updated.`);
    load();
  }

  async function saveVillage(rate) {
    await client.put("/admin/pricing/village/rate", { rate_per_km_paise: Math.round(rate * 100) });
    setMsg("Village-to-village rate updated.");
    load();
  }

  return (
    <div>
      <PageHeader eyebrow="Revenue" title="Rental pricing" />
      {msg && <div className="mb-6"><Alert type="success">{msg}</Alert></div>}

      <div className="space-y-4 mb-8">
        {categories.map((c) => (
          <PriceRow key={c.category} cat={c} onSave={savePricing} />
        ))}
      </div>

      {village && (
        <div className="card p-6">
          <div className="label-eyebrow mb-3">Village-to-village rate</div>
          <VillageRow rate={village.rate_per_km_paise / 100} onSave={saveVillage} />
        </div>
      )}
    </div>
  );
}

function PriceRow({ cat, onSave }) {
  const [min, setMin] = useState(cat.min_rate_paise / 100);
  const [max, setMax] = useState(cat.max_rate_paise / 100);
  return (
    <div className="card p-6">
      <div className="text-ivory font-medium mb-1 capitalize">{cat.category.replace("_", " ")}</div>
      <div className="text-xs text-muted mb-4">{cat.label}</div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-muted mb-1.5 block">Min ₹/day</label>
          <input type="number" className="input-field w-32" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Max ₹/day</label>
          <input type="number" className="input-field w-32" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <button onClick={() => onSave(cat.category, Number(min), Number(max))} className="btn-gold">Save</button>
      </div>
    </div>
  );
}

function VillageRow({ rate, onSave }) {
  const [val, setVal] = useState(rate);
  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="text-xs text-muted mb-1.5 block">₹ per km</label>
        <input type="number" className="input-field w-32" value={val} onChange={(e) => setVal(e.target.value)} />
      </div>
      <button onClick={() => onSave(Number(val))} className="btn-gold">Save</button>
    </div>
  );
}
