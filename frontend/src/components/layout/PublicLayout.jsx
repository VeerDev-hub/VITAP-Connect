import { Link, Outlet } from "react-router-dom";
import { ArrowRight, Github, Linkedin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../ui";
import ThemeToggle from "./ThemeToggle";

function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">Open app <ArrowRight size={14} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join with college email</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-2">
            A student-built network for VIT-AP University: find teammates by skill, run project rooms, and talk in real time.
          </p>
          <div className="mt-4 flex gap-1">
            <a href="https://github.com/VeerDev-hub" className="icon-btn" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={17} /></a>
            <a href="https://www.linkedin.com/in/veer-pratap-singh-99a368310/" className="icon-btn" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a>
          </div>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link className="hover:text-ink" to="/discover">Discover students</Link></li>
            <li><Link className="hover:text-ink" to="/collaborations">Collaborations</Link></li>
            <li><Link className="hover:text-ink" to="/chat">Messages &amp; calls</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link className="hover:text-ink" to="/register">Create account</Link></li>
            <li><Link className="hover:text-ink" to="/login">Log in</Link></li>
            <li><Link className="hover:text-ink" to="/forgot-password">Reset password</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 font-mono text-[11px] text-ink-3 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} VITAP Connect · built by Veer</span>
          <span>Not an official VIT-AP University service</span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
