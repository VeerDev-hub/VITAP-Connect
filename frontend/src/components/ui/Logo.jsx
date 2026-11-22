import { Link } from "react-router-dom";

// A "V" drawn as a path between three campus nodes; the lime node is you.
export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <rect width="36" height="36" rx="11" className="fill-accent" />
      <path d="M10 11 L18 25 L26 11" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent-ink" />
      <circle cx="10" cy="11" r="3.1" className="fill-accent-ink" />
      <circle cx="26" cy="11" r="3.1" className="fill-accent-ink" />
      <circle cx="18" cy="25" r="3.6" className="fill-pop" />
    </svg>
  );
}

export default function Logo({ to = "/", compact = false }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="VITAP Connect home">
      <span className="transition-transform duration-500 ease-out group-hover:-rotate-12 group-hover:scale-105"><LogoMark /></span>
      {!compact && (
        <span className="font-display text-[15px] font-bold leading-none tracking-tight">
          vitap<span className="text-accent">connect</span>
        </span>
      )}
    </Link>
  );
}
