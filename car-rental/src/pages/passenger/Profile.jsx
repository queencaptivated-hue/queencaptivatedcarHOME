import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="max-w-lg">
      <PageHeader eyebrow="Account" title="Profile" />
      <div className="card p-6 space-y-4">
        <Row label="Name" value={user?.name} />
        <Row label="Mobile" value={user?.mobile} />
        <Row label="Account type" value="Passenger" />
      </div>
      <div className="card p-6 mt-6">
        <div className="label-eyebrow mb-2">Need help?</div>
        <p className="text-muted text-sm mb-4">Our support team is here for booking issues, refunds, or driver concerns.</p>
        <a href="tel:+911234567890" className="btn-ghost inline-block text-sm">Contact support</a>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-hairline pb-3 last:border-0 last:pb-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-ivory text-sm">{value}</span>
    </div>
  );
}
