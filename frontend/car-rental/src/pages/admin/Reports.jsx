import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, EmptyState } from "../../components/ui";
import { rupees } from "../../utils/format";

const TABS = [
  { id: "revenue", label: "Revenue" },
  { id: "driver-performance", label: "Drivers" },
  { id: "vehicle-usage", label: "Vehicles" },
  { id: "village-revenue", label: "Village-wise" },
  { id: "passengers", label: "Passengers" },
];

export default function Reports() {
  const [tab, setTab] = useState("revenue");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    client.get(`/admin/reports/${tab}`).then((res) => setRows(res.data));
  }, [tab]);

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Reports" />

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.id ? "border-gold text-gold" : "border-hairline text-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState text="No data yet for this report." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-muted text-xs uppercase tracking-wider">
                {Object.keys(rows[0]).map((k) => <th key={k} className="text-left px-5 py-3 whitespace-nowrap">{k.replace(/_/g, " ")}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-hairline last:border-0">
                  {Object.entries(r).map(([k, v]) => (
                    <td key={k} className="px-5 py-3 whitespace-nowrap text-ivory">
                      {k.includes("paise") ? rupees(v) : String(v ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
