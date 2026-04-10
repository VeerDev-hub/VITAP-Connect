import { memo, useState } from "react";
import { CheckCircle2, Clock3, Github, Instagram, Linkedin, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

const statusCopy = {
  friend: ["Friends", CheckCircle2, "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"],
  requestSent: ["Request sent", Clock3, "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"],
  requestReceived: ["Requested you", UserPlus, "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"]
};

export default memo(function StudentCard({ student, actionLabel = "Connect", onAction, secondaryActionLabel, onSecondaryAction, dangerActionLabel, onDangerAction }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = student.connectionStatus && statusCopy[student.connectionStatus];
  const StatusIcon = status?.[1];
  const canAct = onAction && (!student.connectionStatus || student.connectionStatus === "none");

  return (
    <article 
      className={`card cursor-pointer transition-all duration-300 hover:shadow-xl ${isExpanded ? "ring-2 ring-slate-200 dark:ring-white/10" : "hover:-translate-y-1"}`}
      onClick={(e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <div className="flex items-start gap-4">
        <img loading="lazy" className="h-14 w-14 rounded-2xl object-cover" src={student.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(student.name)}`} alt={student.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold">{student.name}</h3>
            {student.regNumber && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:bg-white/10">{student.regNumber}</span>}
            {status && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status[2]}`}><StatusIcon size={14} /> {status[0]}</span>}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{student.department} - Year {student.year}{student.graduationYear ? ` - Grad ${student.graduationYear}` : ""}</p>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <div className={`mt-4 space-y-4 overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-20 opacity-80"}`}>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {student.bio || student.reason || "Ready to collaborate on campus projects."}
        </p>

        {isExpanded && (
          <div className="flex gap-3 pt-2">
            {student.github && (
              <a href={`https://github.com/${student.github}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="GitHub">
                <Github size={18} />
              </a>
            )}
            {student.linkedin && (
              <a href={`https://linkedin.com/in/${student.linkedin}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="LinkedIn">
                <Linkedin size={18} />
              </a>
            )}
            {student.instagram && (
              <a href={`https://instagram.com/${student.instagram}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="Instagram">
                <Instagram size={18} />
              </a>
            )}
          </div>
        )}

        {student.reason && <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">Why recommended: {student.reason}</p>}
        <div className="flex flex-wrap gap-2">
          {(student.skills || []).map((skill) => <span key={skill} className="tag">{skill}</span>)}
        </div>
      </div>

      {(canAct || onSecondaryAction || onDangerAction) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {canAct && <button className="btn-secondary sm:col-span-2" onClick={() => onAction(student)}>{actionLabel}</button>}
          {onSecondaryAction && <button className="btn-secondary" onClick={() => onSecondaryAction(student)}>{secondaryActionLabel}</button>}
          {onDangerAction && <button className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200" onClick={() => onDangerAction(student)}>{dangerActionLabel}</button>}
        </div>
      )}
    </article>
  );
});
