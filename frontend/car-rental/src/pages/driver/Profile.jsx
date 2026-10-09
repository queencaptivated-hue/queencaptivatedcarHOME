import { useEffect, useState } from "react";
import client from "../../api/client";
import { PageHeader, Alert, Badge } from "../../components/ui";

const DOC_FIELDS = [
  { key: "license_doc", label: "Driving license" },
  { key: "aadhaar_doc", label: "Aadhaar card" },
  { key: "rc_doc", label: "Vehicle RC" },
  { key: "insurance_doc", label: "Insurance" },
  { key: "pollution_doc", label: "Pollution certificate" },
  { key: "selfie", label: "Selfie verification" },
];

export default function Profile() {
  const [driver, setDriver] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [msg, setMsg] = useState("");
  const [docs, setDocs] = useState({});

  async function load() {
    const { data } = await client.get("/driver/me");
    setDriver(data);
    setName(data.name || "");
    setAddress(data.address || "");
    setLicense(data.license_no || "");
    setAadhaar(data.aadhaar_no || "");
    setDocs(JSON.parse(data.documents_json || "{}"));
  }
  useEffect(() => { load(); }, []);

  async function saveProfile(e) {
    e.preventDefault();
    await client.put("/driver/profile", { name, address, license_no: license, aadhaar_no: aadhaar });
    setMsg("Profile updated.");
    load();
  }

  function handleFile(key, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      client.put("/driver/documents", { [key]: reader.result }).then(() => {
        setMsg(`${key.replace("_doc", "")} uploaded.`);
        load();
      });
    };
    reader.readAsDataURL(file);
  }

  if (!driver) return <div className="text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Account" title="Profile & documents" action={<Badge status={driver.approval_status} />} />
      {msg && <div className="mb-6"><Alert type="success">{msg}</Alert></div>}

      <div className="card p-6 mb-6">
        <div className="label-eyebrow mb-4">Personal details</div>
        <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Full name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Mobile</label>
            <input className="input-field opacity-60" value={driver.mobile} disabled />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Driving license number</label>
            <input className="input-field" value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Aadhaar number</label>
            <input className="input-field" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted mb-1.5 block">Address</label>
            <textarea className="input-field" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <button className="btn-gold sm:col-span-2">Save changes</button>
        </form>
      </div>

      <div className="card p-6">
        <div className="label-eyebrow mb-4">Documents</div>
        <div className="space-y-3">
          {DOC_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between border-b border-hairline pb-3 last:border-0">
              <div>
                <div className="text-sm text-ivory">{f.label}</div>
                <div className="text-xs text-muted">{docs[f.key] ? "Uploaded" : "Not uploaded"}</div>
              </div>
              <label className="btn-ghost text-xs cursor-pointer">
                {docs[f.key] ? "Replace" : "Upload"}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(f.key, e.target.files[0])} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
