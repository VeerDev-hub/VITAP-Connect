import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Compass, FolderKanban, LayoutDashboard, LogOut, Menu, MessageSquare, MessageSquareHeart, Shield, UserRound, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Avatar, Logo } from "../ui";
import NotificationsMenu from "./NotificationsMenu";
import ThemeToggle from "./ThemeToggle";
import { useLiveNotifications } from "./useLiveNotifications";

const NAV = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", short: "Discover", icon: Compass },
  { to: "/connections", label: "Network", short: "Network", icon: Users },
  { to: "/collaborations", label: "Collaborations", short: "Teams", icon: FolderKanban },
  { to: "/chat", label: "Messages", short: "Chat", icon: MessageSquare }
];

const FULL_BLEED = ["/chat"];

function SidebarLink({ item, index, dot, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-ink text-bg" : "text-ink-2 hover:bg-sunken hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
          <span className="flex-1">{item.label}</span>
          {dot && <span className="h-2 w-2 rounded-full bg-accent" />}
          {index !== undefined && <span className={`font-mono text-[10px] ${isActive ? "text-bg/60" : "text-ink-3"}`}>{String(index).padStart(2, "0")}</span>}
        </>
      )}
    </NavLink>
  );
}

function MobileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const item = "flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-sunken";
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
        <Menu size={18} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 animate-fade-up overflow-hidden rounded-lg border border-line bg-surface shadow-pop" onClick={() => setOpen(false)}>
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              {user.regNumber && <p className="font-mono text-[11px] text-ink-3">{user.regNumber}</p>}
            </div>
          </div>
          <Link to="/profile" className={item}><UserRound size={16} /> Profile</Link>
          <Link to="/feedback" className={item}><MessageSquareHeart size={16} /> Feedback</Link>
          {user.role === "admin" && <Link to="/admin" className={item}><Shield size={16} /> Admin</Link>}
          <button type="button" onClick={onLogout} className={`${item} border-t border-line text-bad`}><LogOut size={16} /> Log out</button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const feed = useLiveNotifications(user);
  const fullBleed = FULL_BLEED.some((p) => pathname.startsWith(p));
  const { clearUnreadChats } = feed;

  useEffect(() => {
    if (pathname.startsWith("/chat")) clearUnreadChats();
  }, [pathname, clearUnreadChats]);

  useEffect(() => {
    if (!fullBleed) window.scrollTo(0, 0);
  }, [pathname, fullBleed]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo to="/dashboard" />
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          <p className="eyebrow px-3 pb-2 pt-1">Workspace</p>
          {NAV.map((item, i) => (
            <SidebarLink key={item.to} item={item} index={i + 1} dot={item.to === "/chat" && feed.hasUnreadChats} />
          ))}
          {user.role === "admin" && (
            <>
              <p className="eyebrow px-3 pb-2 pt-5">Moderation</p>
              <SidebarLink item={{ to: "/admin", label: "Admin", icon: Shield }} />
            </>
          )}
        </nav>
        <div className="space-y-0.5 border-t border-line px-3 py-3">
          <NotificationsMenu feed={feed} withLabel align="left" />
          <Link to="/feedback" className="btn btn-ghost btn-sm w-full justify-start"><MessageSquareHeart size={16} /> Send feedback</Link>
          <ThemeToggle withLabel />
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 -m-1 hover:bg-sunken">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate font-mono text-[11px] text-ink-3">{user.regNumber || user.department || user.role}</p>
            </div>
          </Link>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-3 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-0.5">
          <NotificationsMenu feed={feed} />
          <ThemeToggle />
          <MobileMenu user={user} onLogout={handleLogout} />
        </div>
      </header>

      <main className={fullBleed ? "pb-16 lg:pb-0" : "mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10"}>
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? "text-ink" : "text-ink-3"}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-5 top-0 h-0.5 bg-accent" />}
                  <span className="relative">
                    <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                    {item.to === "/chat" && feed.hasUnreadChats && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />}
                  </span>
                  {item.short}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
