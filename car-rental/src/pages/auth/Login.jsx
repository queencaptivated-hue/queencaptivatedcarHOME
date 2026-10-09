import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Alert } from "../../components/ui";

export default function Login() {
  const [tab, setTab] = useState("user"); // user | admin
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <a href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-ivory transition-colors text-sm mb-6">
          <span aria-hidden="true">←</span> Back to Queen Captivated
        </a>
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Queen Captivated" className="h-14 w-14 rounded-full object-cover ring-1 ring-gold/40 mb-4" />
          <h1 className="font-display text-3xl text-ivory">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Sign in to Queen Captivated</p>
        </div>

        <div className="card p-7">
          <div className="grid grid-cols-2 gap-2 mb-6 bg-charcoal rounded-lg p-1">
            <button onClick={() => setTab("user")} className={`py-2 rounded-md text-sm font-semibold transition-colors ${tab === "user" ? "bg-gold text-obsidian" : "text-muted hover:text-ivory"}`}>
              Passenger / Driver
            </button>
            <button onClick={() => setTab("admin")} className={`py-2 rounded-md text-sm font-semibold transition-colors ${tab === "admin" ? "bg-gold text-obsidian" : "text-muted hover:text-ivory"}`}>
              Super Admin
            </button>
          </div>
          {tab === "user" ? <UserLogin /> : <AdminLogin />}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          New here?{" "}
          <Link to="/register" className="text-gold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

function UserLogin() {
  const [step, setStep] = useState("mobile");
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
      const { data } = await client.post("/auth/otp/request", { mobile, purpose: "login" });
      setDevOtp(data.devOtp || null);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login/otp", { mobile, otp });
      login(data.token, data.user);
      navigate(data.user.role === "driver" ? "/driver" : "/passenger");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {step === "mobile" ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Mobile number</label>
            <input className="input-field" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" maxLength={10} required />
          </div>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Sending OTP…" : "Send OTP"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          {devOtp && <Alert type="info">Dev mode — your OTP is <span className="font-bold text-gold">{devOtp}</span></Alert>}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Enter OTP</label>
            <input className="input-field tracking-widest text-center text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
          </div>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Verifying…" : "Sign in"}</button>
        </form>
      )}
    </>
  );
}

function AdminLogin() {
  const [step, setStep] = useState("password");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function submitPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login/admin/password", { mobile, password });
      setDevOtp(data.devOtp || null);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login/admin/verify-otp", { mobile, otp });
      login(data.token, data.user);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {step === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Admin mobile number</label>
            <input className="input-field" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Password</label>
            <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Checking…" : "Continue"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          {devOtp && <Alert type="info">Dev mode — your 2FA OTP is <span className="font-bold text-gold">{devOtp}</span></Alert>}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Enter 2FA OTP</label>
            <input className="input-field tracking-widest text-center text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
          </div>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Verifying…" : "Sign in as Admin"}</button>
        </form>
      )}
    </>
  );
}
