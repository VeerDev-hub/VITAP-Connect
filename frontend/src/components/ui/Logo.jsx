import { Link } from "react-router-dom";

export function LogoMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-ink" />
      <path d="M11 11 L22 14 L13 22 Z" fill="none" strokeWidth="1.4" strokeLinejoin="round" className="stroke-bg" />
      <circle cx="11" cy="11" r="3.2" className="fill-bg" />
      <circle cx="22" cy="14" r="3.2" className="fill-accent" />
      <circle cx="13" cy="22" r="3.2" className="fill-bg" />
    </svg>
  );
}

export default function Logo({ to = "/", compact = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="VITAP Connect home">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight">
          VITAP<span className="text-ink-3">/</span>Connect
        </span>
      )}
    </Link>
  );
}
