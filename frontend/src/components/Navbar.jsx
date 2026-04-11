import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  ["Dashboard", "/dashboard"],
  ["Discover", "/discover"],
  ["Connections", "/connections"],
  ["Projects", "/projects"],
  ["Chat", "/chat"]
];

function NavItem({ to, children }) {
  return (
    <NavLink to={to} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>
      {children}
    </NavLink>
  );
}

export default function Navbar({ darkMode, setDarkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          VITAP<span className="text-slate-900 dark:text-slate-100">Connect</span>
        </Link>
        <div className="hidden items-center gap-2 lg:flex">
          {user && links.map(([label, href]) => <NavItem key={href} to={href}>{label}</NavItem>)}
          {user?.role === "admin" && <NavItem to="/admin">Admin</NavItem>}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button className="btn-secondary !p-3 lg:hidden" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Toggle navigation menu">
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
          <button className="btn-secondary !p-3" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <Link className="flex items-center gap-2 group transition-all" to="/profile">
                <img 
                  className="h-9 w-9 rounded-full object-cover border-2 border-slate-200 dark:border-white/10 group-hover:border-blue-500 transition-colors" 
                  src={user.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                  alt={user.name} 
                />
                <span className="hidden md:inline font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                  {user.name.split(" ")[0]}
                </span>
              </Link>
              <button className="btn-primary !px-5" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
            </div>
          ) : (
            <>
              <Link className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 hidden sm:inline-block" to="/login">Login</Link>
              <Link className="btn-primary !px-4 !py-2 text-sm" to="/register">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      </header>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] w-full bg-white dark:bg-slate-950 lg:hidden animate-in slide-in-from-left duration-300 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 dark:border-white/10">
            <Link to="/" className="font-display text-2xl font-bold tracking-tight" onClick={() => setMobileMenuOpen(false)}>
              VITAP<span className="text-slate-900 dark:text-slate-100">Connect</span>
            </Link>
            <button className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-6 px-4 py-8 overflow-y-auto flex-1">
            {user ? (
              <>
                {links.map(([label, href]) => (
                  <NavLink key={href} to={href} className={({ isActive }) => `text-3xl font-display font-bold transition-colors ${isActive ? "text-blue-600" : "text-slate-800 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400"}`} onClick={() => setMobileMenuOpen(false)}>
                    {label}
                  </NavLink>
                ))}
                {user.role === "admin" && (
                  <NavLink to="/admin" className={({ isActive }) => `text-3xl font-display font-bold transition-colors ${isActive ? "text-blue-600" : "text-slate-800 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400"}`} onClick={() => setMobileMenuOpen(false)}>
                    Admin
                  </NavLink>
                )}
                <Link to="/profile" className="text-3xl font-display font-bold text-slate-800 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400 mt-2" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                <button className="text-xl font-bold text-rose-500 mt-6 px-8 py-3 rounded-full bg-rose-50 dark:bg-rose-500/10" onClick={() => { logout(); navigate("/login"); setMobileMenuOpen(false); }}>Logout</button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
