import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { CountUp, SplitText, SpotlightCard } from "../motion";

export { default as Avatar } from "./Avatar";
export { default as Logo, LogoMark } from "./Logo";
export { default as TagInput } from "./TagInput";
export { default as OtpInput } from "./OtpInput";
export { default as PasswordInput, PasswordStrength } from "./PasswordInput";

export function PageHeader({ index, eyebrow, title, description, actions }) {
  return (
    <header className="flex flex-col gap-5 pb-2 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {(index || eyebrow) && (
          <motion.p className="eyebrow" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <span className="h-1.5 w-1.5 rounded-full bg-pop shadow-[0_0_0_4px_rgb(var(--pop)/0.25)]" />
            {eyebrow}
          </motion.p>
        )}
        <h1 className="mt-3 text-3xl leading-[1.1] sm:text-[2.6rem]"><SplitText text={title} /></h1>
        {description && (
          <motion.p className="mt-3 max-w-2xl text-[15.5px] text-ink-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }}>
            {description}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div className="flex shrink-0 flex-wrap items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {actions}
        </motion.div>
      )}
    </header>
  );
}

export function SectionTitle({ title, count, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[17px]">
        {title}
        {count !== undefined && <span className="rounded-full bg-sunken px-2 py-0.5 font-body text-xs font-bold text-ink-2">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="dot-grid flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center"
    >
      {Icon && (
        <span className="mb-4 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={26} strokeWidth={1.8} />
        </span>
      )}
      <p className="font-display text-base font-semibold">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
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
  return (
    <div
      className={`animate-shimmer rounded-3xl ${className}`}
      style={{ backgroundImage: "linear-gradient(90deg, rgb(var(--sunken)) 0%, rgb(var(--line)) 50%, rgb(var(--sunken)) 100%)", backgroundSize: "200% 100%" }}
    />
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-2">
      <LoaderCircle className="animate-spin text-accent" size={20} /> {label}
    </div>
  );
}

const STAT_TONES = { default: "", accent: "text-accent", ok: "text-ok", warn: "text-warn" };

// Numbers count up; strings like "82%" count the number part.
export function Stat({ label, value, tone = "default", icon: Icon, children }) {
  const match = typeof value === "number" ? [null, value, ""] : String(value).match(/^(\d+)(.*)$/);
  return (
    <SpotlightCard className="panel-pad h-full" tilt={3}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-bold text-ink-2">{label}</p>
        {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={17} /></span>}
      </div>
      <p className={`mt-3 font-display text-[2rem] font-bold leading-none tabular-nums ${STAT_TONES[tone]}`}>
        {match ? <CountUp value={match[1]} suffix={match[2]} /> : value}
      </p>
      {children}
    </SpotlightCard>
  );
}

const BADGE_TONES = {
  neutral: "bg-sunken text-ink-2",
  accent: "bg-accent-soft text-accent",
  pop: "bg-pop text-pop-ink",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad"
};

export function Badge({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${BADGE_TONES[tone]} ${className}`}>
      {Icon && <Icon size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function Count({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-pop px-1.5 py-1 text-[11px] font-extrabold leading-none text-pop-ink">
      {value > 99 ? "99+" : value}
    </span>
  );
}
