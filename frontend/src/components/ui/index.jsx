import { LoaderCircle } from "lucide-react";

export { default as Avatar } from "./Avatar";
export { default as Logo, LogoMark } from "./Logo";
export { default as TagInput } from "./TagInput";
export { default as OtpInput } from "./OtpInput";
export { default as PasswordInput, PasswordStrength } from "./PasswordInput";

export function PageHeader({ index, eyebrow, title, description, actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {(index || eyebrow) && (
          <p className="eyebrow flex items-center gap-2">
            {index && <span className="text-accent">{index}</span>}
            {index && eyebrow && <span className="text-line-strong">/</span>}
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, count, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        {count !== undefined && <span className="font-mono text-xs font-medium text-ink-3">{String(count).padStart(2, "0")}</span>}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 text-ink-3" size={28} strokeWidth={1.5} />}
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, error, htmlFor, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-bad">{error}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-sunken ${className}`} />;
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-2">
      <LoaderCircle className="animate-spin" size={18} /> {label}
    </div>
  );
}

const STAT_TONES = { default: "", accent: "text-accent", ok: "text-ok", warn: "text-warn" };

export function Stat({ label, value, tone = "default", children }) {
  return (
    <div className="panel-pad">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${STAT_TONES[tone]}`}>{value}</p>
      {children}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "border-line bg-sunken text-ink-2",
  accent: "border-accent/30 bg-accent-soft text-accent",
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  bad: "border-bad/30 bg-bad-soft text-bad"
};

export function Badge({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone]} ${className}`}>
      {Icon && <Icon size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function Count({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none text-accent-ink">
      {value > 99 ? "99+" : value}
    </span>
  );
}
