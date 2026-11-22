import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Github, Linkedin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../ui";
import ThemeToggle from "./ThemeToggle";

function PublicHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header className="sticky top-0 z-40 px-3 pt-3 sm:px-4" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <div className={`mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border px-3 pl-5 transition-all duration-300 ${scrolled ? "border-line bg-surface/85 shadow-float backdrop-blur-xl" : "border-transparent"}`}>
        <Logo />
        <nav className="hidden items-center gap-1 text-sm font-bold text-ink-2 md:flex">
          <a href="#how" className="rounded-full px-4 py-2 hover:bg-sunken hover:text-ink">How it works</a>
          <a href="#features" className="rounded-full px-4 py-2 hover:bg-sunken hover:text-ink">Features</a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">Open app <ArrowRight size={14} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join now</Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

function Footer() {
  return (
    <footer className="px-3 pb-3 sm:px-4">
      <div className="dark mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#121a3d] via-[#0b1028] to-[#070a16] text-ink ring-1 ring-white/10">
        <div className="grid gap-10 px-6 py-12 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-ink-2">
              A student-built network for VIT-AP University: find teammates by skill, run project rooms, and talk in real time.
            </p>
            <div className="mt-5 flex gap-1">
              <a href="https://github.com/VeerDev-hub" className="icon-btn border border-line" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={17} /></a>
              <a href="https://www.linkedin.com/in/veer-pratap-singh-99a368310/" className="icon-btn border border-line" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a>
            </div>
          </div>
          <div>
            <p className="eyebrow">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-ink-2">
              <li><Link className="hover:text-pop" to="/discover">Discover students</Link></li>
              <li><Link className="hover:text-pop" to="/collaborations">Teams &amp; projects</Link></li>
              <li><Link className="hover:text-pop" to="/chat">Messages &amp; calls</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-ink-2">
              <li><Link className="hover:text-pop" to="/register">Create account</Link></li>
              <li><Link className="hover:text-pop" to="/login">Log in</Link></li>
              <li><Link className="hover:text-pop" to="/forgot-password">Reset password</Link></li>
            </ul>
          </div>
        </div>
        <div className="select-none overflow-hidden px-6 font-display text-[12vw] font-black leading-[0.85] tracking-tighter text-ink/[0.07] sm:px-10 lg:text-[8.6rem]">vitapconnect</div>
        <div className="flex flex-col gap-2 border-t border-line px-6 py-5 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-10">
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
