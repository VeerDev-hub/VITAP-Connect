import { memo, useState } from "react";
import { Check, Clock3, Github, Instagram, Linkedin, Sparkles, UserPlus } from "lucide-react";
import { socialUrl } from "../lib/format";
import { Avatar, Badge } from "./ui";

const STATUS = {
  friend: { label: "Connected", tone: "ok", icon: Check },
  requestSent: { label: "Request sent", tone: "warn", icon: Clock3 },
  requestReceived: { label: "Wants to connect", tone: "accent", icon: UserPlus }
};

const SOCIALS = [
  ["github", Github, "GitHub"],
  ["linkedin", Linkedin, "LinkedIn"],
  ["instagram", Instagram, "Instagram"]
];

function ActionButton({ className, onClick, children }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try {
      await onClick();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={`btn btn-sm ${className}`} onClick={handle} disabled={busy}>
      {children}
    </button>
  );
}

function StudentCard({ student, actionLabel = "Connect", onAction, secondaryActionLabel, onSecondaryAction, dangerActionLabel, onDangerAction, online }) {
  const status = STATUS[student.connectionStatus];
  const canAct = onAction && (!student.connectionStatus || student.connectionStatus === "none");
  const skills = student.skills || [];
  const meta = [student.department, student.year && `Year ${student.year}`, student.graduationYear && `’${String(student.graduationYear).slice(-2)}`].filter(Boolean).join(" · ");
  const socials = SOCIALS.map(([key, Icon, label]) => [socialUrl(key, student[key]), Icon, label]).filter(([url]) => url);

  return (
    <article className="panel flex flex-col p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <Avatar name={student.name} src={student.avatarUrl} size="lg" online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-semibold leading-tight">{student.name}</h3>
            {status && <Badge tone={status.tone} icon={status.icon} className="shrink-0">{status.label}</Badge>}
          </div>
          {student.regNumber && <p className="mt-0.5 font-mono text-[11px] text-ink-3">{student.regNumber}</p>}
          {meta && <p className="mt-1 truncate text-sm text-ink-2">{meta}</p>}
        </div>
      </div>

      {student.reason && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
          <Sparkles size={13} /> {student.reason}
        </p>
      )}

      {student.bio && <p className="mt-4 line-clamp-2 text-sm text-ink-2">{student.bio}</p>}

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => <span key={skill} className="tag">{skill}</span>)}
          {skills.length > 5 && <span className="tag border-dashed bg-transparent">+{skills.length - 5}</span>}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <div className="flex -ml-2">
          {socials.map(([url, Icon, label]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="icon-btn h-8 w-8" title={label} aria-label={`${student.name} on ${label}`}>
              <Icon size={15} />
            </a>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {onDangerAction && <ActionButton className="btn-ghost text-bad hover:bg-bad-soft hover:text-bad" onClick={() => onDangerAction(student)}>{dangerActionLabel}</ActionButton>}
          {onSecondaryAction && <ActionButton className="btn-secondary" onClick={() => onSecondaryAction(student)}>{secondaryActionLabel}</ActionButton>}
          {canAct && <ActionButton className="btn-primary" onClick={() => onAction(student)}><UserPlus size={14} /> {actionLabel}</ActionButton>}
        </div>
      </div>
    </article>
  );
}

export default memo(StudentCard);
