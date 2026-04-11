import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getSocket } from "../services/socket";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const links = [
  ["Dashboard", "/dashboard"],
  ["Discover", "/discover"],
  ["Connections", "/connections"],
  ["Collaborations", "/collaborations"],
  ["Chat", "/chat"]
];

function NavItem({ to, children, hasBadge, onClick }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `relative rounded-full px-4 py-2 text-sm font-semibold flex items-center justify-center ${isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>
      {children}
      {hasBadge && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#0f172a]"></span>}
    </NavLink>
  );
}

export default function Navbar({ darkMode, setDarkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    const thisSocket = getSocket();
    
    // Initial fetch
    api.get("/notifications").then(res => {
      setNotifications(res.data.notifications || []);
    }).catch(() => {});

    // Listen to real-time events
    const handleNotif = (data) => {
      setNotifications(prev => [{ ...data, id: Date.now(), createdAt: new Date().toISOString() }, ...prev].slice(0, 15));
      setUnreadCount(prev => prev + 1);
    };

    const handleChatNotif = (data) => {
      if (window.location.pathname !== "/chat") {
        setHasUnreadChats(true);
        // Also add to Bell notifications for visibility
        setNotifications(prev => [{ 
          message: `New message from ${data.senderName}`, 
          id: Date.now(), 
          createdAt: new Date().toISOString(),
          type: 'chat'
        }, ...prev].slice(0, 15));
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleProjectChatNotif = (data) => {
      if (window.location.pathname !== "/chat") {
        setHasUnreadChats(true);
        setNotifications(prev => [{ 
          message: `Group update: ${data.senderName} sent a message`, 
          id: Date.now(), 
          createdAt: new Date().toISOString(),
          type: 'chat'
        }, ...prev].slice(0, 15));
        setUnreadCount(prev => prev + 1);
      }
    };
    
    thisSocket.on("notification", handleNotif);
    thisSocket.on("direct:message", handleChatNotif);
    thisSocket.on("project:message", handleProjectChatNotif);
    thisSocket.on("group:message", handleProjectChatNotif);

    return () => {
      thisSocket.off("notification", handleNotif);
      thisSocket.off("direct:message", handleChatNotif);
      thisSocket.off("project:message", handleProjectChatNotif);
      thisSocket.off("group:message", handleProjectChatNotif);
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname === "/chat") setHasUnreadChats(false);
  }, [location.pathname]);

  // Click outside listener for dropdown
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          VITAP<span className="text-slate-900 dark:text-slate-100">Connect</span>
        </Link>
        <div className="hidden items-center gap-2 lg:flex">
          {user && links.map(([label, href]) => (
            <NavItem 
              key={href} 
              to={href} 
              hasBadge={label === "Chat" && hasUnreadChats}
              onClick={() => { if (label === "Chat") setHasUnreadChats(false); }}
            >
              {label}
            </NavItem>
          ))}
          {user?.role === "admin" && <NavItem to="/admin">Admin</NavItem>}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <button className="btn-secondary !p-2 sm:!p-3 lg:hidden" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Toggle navigation menu">
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button 
                className="btn-secondary !p-2 sm:!p-3 relative"
                onClick={() => { setShowDropdown(!showDropdown); setUnreadCount(0); }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border border-white dark:border-slate-900 rounded-full animate-pulse"></span>}
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notifications</span>
                    <button onClick={() => { api.delete("/notifications/clear"); setNotifications([]); setUnreadCount(0); }} className="text-xs font-semibold text-slate-500 hover:text-rose-500">Clear All</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-sm text-center text-slate-500">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button className="btn-secondary !p-2 sm:!p-3" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <div className="hidden sm:flex items-center gap-3">
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
                  <NavLink 
                    key={href} 
                    to={href} 
                    className={({ isActive }) => `relative text-3xl font-display font-bold transition-colors ${isActive ? "text-blue-600" : "text-slate-800 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400"}`} 
                    onClick={() => { setMobileMenuOpen(false); if (label === "Chat") setHasUnreadChats(false); }}
                  >
                    {label}
                    {label === "Chat" && hasUnreadChats && <span className="absolute top-1 -right-4 w-3.5 h-3.5 bg-rose-500 rounded-full animate-pulse border-[3px] border-white dark:border-slate-950"></span>}
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
