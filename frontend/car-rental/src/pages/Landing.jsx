import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <a href="/" className="text-muted hover:text-ivory transition-colors text-sm flex items-center gap-1.5">
            <span aria-hidden="true">←</span> Back
          </a>
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Queen Captivated" className="h-11 w-11 rounded-full object-cover ring-1 ring-gold/40" />
            <span className="font-display text-xl tracking-wide text-ivory">QUEEN CAPTIVATED</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link to="/register" className="btn-gold text-sm">Get started</Link>
        </div>
      </nav>

      <header className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-20 pb-24">
        <div className="label-eyebrow mb-5">Village-to-village · Airport · Rentals</div>
        <h1 className="font-display text-5xl md:text-7xl leading-[1.05] text-ivory mb-6">
          Rides built for<br /><span className="text-gold italic">real terrain.</span>
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto mb-10">
          High-clearance vehicles, verified drivers, and transparent fares —
          booked in minutes across every village and town we serve.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-gold">Book a ride</Link>
          <Link to="/register?role=driver" className="btn-ghost">Drive with us</Link>
        </div>
      </header>

      <div className="gold-divider max-w-3xl mx-auto" />

      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
        {[
          { t: "Verified fleet", d: "Every vehicle is checked for ground clearance and road-worthiness before it's approved." },
          { t: "Transparent wallets", d: "Drivers see exactly what they earn and owe — no surprises, no hidden cuts." },
          { t: "Fair, fixed pricing", d: "Village-to-village fares calculated automatically by distance, every time." },
        ].map((f) => (
          <div key={f.t} className="card p-7">
            <h3 className="font-display text-2xl text-gold mb-2">{f.t}</h3>
            <p className="text-muted text-sm leading-relaxed">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="relative z-10 text-center py-10 text-xs text-muted border-t border-hairline">
        © {new Date().getFullYear()} Queen Captivated. All rights reserved.
      </footer>
    </div>
  );
}
