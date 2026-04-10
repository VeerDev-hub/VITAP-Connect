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
          <button className="btn-secondary !p-3 lg:hidden" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Toggle navigation menu">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button className="btn-secondary !p-3" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <Link className="btn-secondary hidden sm:inline-flex" to="/profile">Profile</Link>
              <button className="btn-primary" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn-secondary hidden sm:inline-flex" to="/login">Login</Link>
              <Link className="btn-primary" to="/register">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/90">
          <div className="flex flex-col gap-2">
            {user ? (
              <>
                {links.map(([label, href]) => (
                  <NavLink key={href} to={href} className={({ isActive }) => `rounded-full px-4 py-3 text-sm font-semibold ${isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`} onClick={() => setMobileMenuOpen(false)}>
                    {label}
                  </NavLink>
                ))}
                {user.role === "admin" && (
                  <NavLink to="/admin" className={({ isActive }) => `rounded-full px-4 py-3 text-sm font-semibold ${isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`} onClick={() => setMobileMenuOpen(false)}>
                    Admin
                  </NavLink>
                )}
                <Link to="/profile" className="rounded-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" className="btn-primary text-center" onClick={() => setMobileMenuOpen(false)}>Create Account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
