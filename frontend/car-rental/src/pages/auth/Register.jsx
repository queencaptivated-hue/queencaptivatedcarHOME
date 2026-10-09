import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Alert } from "../../components/ui";

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "driver" ? "driver" : "passenger");
  const [step, setStep] = useState("form"); // form | otp
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(mobile)) return setError("Enter a valid 10-digit mobile number.");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/otp/request", { mobile, purpose: "register" });
      setDevOtp(data.devOtp || null);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/register", { mobile, otp, name, role });
      login(data.token, data.user);
      navigate(role === "driver" ? "/driver" : "/passenger");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <a href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-ivory transition-colors text-sm mb-6">
          <span aria-hidden="true">←</span> Back to Queen Captivated
        </a>
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Queen Captivated" className="h-14 w-14 rounded-full object-cover ring-1 ring-gold/40 mb-4" />
          <h1 className="font-display text-3xl text-ivory">Create your account</h1>
          <p className="text-muted text-sm mt-1">Join Queen Captivated</p>
        </div>

        <div className="card p-7">
          <div className="grid grid-cols-2 gap-2 mb-6 bg-charcoal rounded-lg p-1">
            {["passenger", "driver"].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2 rounded-md text-sm font-semibold capitalize transition-colors ${
                  role === r ? "bg-gold text-obsidian" : "text-muted hover:text-ivory"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && <div className="mb-4"><Alert>{error}</Alert></div>}

          {step === "form" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Full name</label>
                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Mobile number</label>
                <input className="input-field" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" maxLength={10} required />
              </div>
              <button className="btn-gold w-full" disabled={loading}>{loading ? "Sending OTP…" : "Send OTP"}</button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-4">
              {devOtp && (
                <Alert type="info">
                  Dev mode — no SMS account connected yet. Your OTP is <span className="font-bold text-gold">{devOtp}</span>
                </Alert>
              )}
              <div>
                <label className="text-xs text-muted mb-1.5 block">Enter OTP sent to {mobile}</label>
                <input className="input-field tracking-widest text-center text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
              </div>
              <button className="btn-gold w-full" disabled={loading}>{loading ? "Verifying…" : "Create account"}</button>
              <button type="button" onClick={() => setStep("form")} className="text-xs text-muted hover:text-gold block mx-auto">
                Change mobile number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
