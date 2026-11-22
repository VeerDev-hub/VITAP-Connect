import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Compass, FolderKanban, LayoutDashboard, LogOut, MessageSquare, MessageSquareHeart, Shield, UserRound, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageTransition } from "../motion";
import { Avatar, Logo } from "../ui";
import NotificationsMenu from "./NotificationsMenu";
import ThemeToggle from "./ThemeToggle";
import { useLiveNotifications } from "./useLiveNotifications";

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/connections", label: "Network", icon: Users },
  { to: "/collaborations", label: "Teams", icon: FolderKanban },
  { to: "/chat", label: "Chat", icon: MessageSquare }
];

const FULL_BLEED = ["/chat"];
const pill = { type: "spring", stiffness: 420, damping: 34 };

// Desktop: pill nav with a highlight that slides between items.
function TopNav({ unread }) {
  return (
    <nav className="relative hidden items-center gap-1 rounded-full bg-sunken/70 p-1 lg:flex">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className="relative rounded-full px-4 py-2 text-sm font-bold">
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="nav-pill" transition={pill} className="absolute inset-0 rounded-full bg-surface shadow-[0_4px_14px_-6px_rgb(var(--ink)/0.35)]" />}
              <span className={`relative flex items-center gap-2 transition-colors ${isActive ? "text-ink" : "text-ink-3 hover:text-ink"}`}>
                <item.icon size={16} strokeWidth={isActive ? 2.4 : 2} className={isActive ? "text-accent" : ""} />
                {item.label}
                {item.to === "/chat" && unread && <span className="h-2 w-2 rounded-full bg-pop ring-2 ring-surface" />}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const item = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-sunken hover:text-ink";

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition hover:bg-sunken" aria-label="Account menu">
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <ChevronDown size={14} className={`hidden text-ink-3 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-float"
            onClick={() => setOpen(false)}
          >
            <div className="mb-1 flex items-center gap-3 rounded-2xl bg-sunken/70 px-3 py-3">
              <Avatar name={user.name} src={user.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate font-mono text-[11px] text-ink-3">{user.regNumber || user.department || user.role}</p>
              </div>
            </div>
            <Link to="/profile" className={item}><UserRound size={16} /> Your profile</Link>
            <Link to="/feedback" className={item}><MessageSquareHeart size={16} /> Send feedback</Link>
            {user.role === "admin" && <Link to="/admin" className={item}><Shield size={16} /> Admin</Link>}
            <div className="my-1 border-t border-line" />
            <button type="button" onClick={onLogout} className={`${item} text-bad hover:text-bad`}><LogOut size={16} /> Log out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile: floating dock with a sliding blob behind the active tab.
function Dock({ unread }) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 mb-[env(safe-area-inset-bottom)] grid h-16 grid-cols-5 rounded-full border border-line bg-surface/90 p-1.5 shadow-float backdrop-blur-xl lg:hidden">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className="relative flex items-center justify-center" aria-label={item.label}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="dock-pill" transition={pill} className="absolute inset-0 rounded-full bg-accent" />}
              <span className={`relative flex flex-col items-center gap-0.5 text-[10px] font-bold ${isActive ? "text-accent-ink" : "text-ink-3"}`}>
                <motion.span animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.1 : 1 }} transition={pill} className="relative inline-flex">
                  <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  {item.to === "/chat" && unread && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-pop ring-2 ring-surface" />}
                </motion.span>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const feed = useLiveNotifications(user);
  const fullBleed = FULL_BLEED.some((p) => pathname.startsWith(p));
  const { clearUnreadChats } = feed;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/chat")) clearUnreadChats();
  }, [pathname, clearUnreadChats]);

  useEffect(() => {
    if (!fullBleed) window.scrollTo(0, 0);
  }, [pathname, fullBleed]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="relative min-h-dvh">
      {/* soft glow in the corner of every app page */}
      <div className="pointer-events-none fixed -right-40 -top-40 -z-0 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />

      <header className="sticky top-0 z-40 px-3 pt-2 sm:px-4 lg:pt-3">
        <div className={`mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-full border px-3 pl-4 transition-all duration-300 lg:h-16 ${scrolled || fullBleed ? "border-line bg-surface/85 shadow-float backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
          <Logo to="/dashboard" />
          <TopNav unread={feed.hasUnreadChats} />
          <div className="flex items-center gap-0.5">
            <NotificationsMenu feed={feed} />
            <ThemeToggle />
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className={`relative ${fullBleed ? "mx-auto max-w-7xl px-0 pb-0 pt-2 sm:px-4 lg:pb-4 lg:pt-4" : "mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10"}`}>
        <PageTransition id={pathname}>
          <Outlet />
        </PageTransition>
      </main>

      <Dock unread={feed.hasUnreadChats} />
    </div>
  );
}
