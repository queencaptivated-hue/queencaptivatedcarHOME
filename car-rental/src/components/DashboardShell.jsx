import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, ArrowLeft } from "lucide-react";

export default function DashboardShell({ links, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-obsidian flex">
      <aside className="w-64 shrink-0 border-r border-hairline hidden md:flex flex-col">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-hairline">
          <img src="/logo.jpg" alt="QC" className="h-9 w-9 rounded-full object-cover ring-1 ring-gold/40" />
          <div>
            <div className="font-display text-lg leading-none text-ivory">QUEEN CAPTIVATED</div>
            <div className="text-[10px] uppercase tracking-widest2 text-gold-deep mt-1">{user?.role?.replace("_", " ")}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-gold/10 text-gold border border-gold/20" : "text-muted hover:text-ivory hover:bg-white/5"
                }`
              }
            >
              <l.icon size={17} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-hairline space-y-3">
          <div>
            <div className="text-sm text-ivory mb-0.5">{user?.name || "—"}</div>
            <div className="text-xs text-muted mb-3">{user?.mobile}</div>
          </div>
          <a href="/" className="flex items-center gap-2 text-xs text-muted hover:text-ivory transition-colors">
            <span aria-hidden="true">←</span> Back to Queen Captivated
          </a>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-muted hover:text-garnet transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-charcoal border-b border-hairline flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <a href="/" aria-label="Back to Queen Captivated" className="text-muted mr-1"><ArrowLeft size={18} /></a>
          <img src="/logo.jpg" alt="QC" className="h-8 w-8 rounded-full object-cover ring-1 ring-gold/40" />
          <span className="font-display text-ivory">QUEEN CAPTIVATED</span>
        </div>
        <button onClick={handleLogout} className="text-muted"><LogOut size={18} /></button>
      </div>

      <main className="flex-1 px-5 md:px-10 py-8 md:py-10 mt-14 md:mt-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-charcoal border-t border-hairline flex justify-around py-2">
        {links.slice(0, 5).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${isActive ? "text-gold" : "text-muted"}`}
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
