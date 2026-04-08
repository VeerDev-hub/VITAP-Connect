import { CheckCircle2, Clock3, UserPlus } from "lucide-react";

const statusCopy = {
  friend: ["Friends", CheckCircle2, "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"],
  requestSent: ["Request sent", Clock3, "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"],
  requestReceived: ["Requested you", UserPlus, "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"]
};

export default function StudentCard({ student, actionLabel = "Connect", onAction, secondaryActionLabel, onSecondaryAction, dangerActionLabel, onDangerAction }) {
  const status = student.connectionStatus && statusCopy[student.connectionStatus];
  const StatusIcon = status?.[1];
  const canAct = onAction && (!student.connectionStatus || student.connectionStatus === "none");

  return (
    <article className="card transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start gap-4">
        <img className="h-14 w-14 rounded-2xl object-cover" src={student.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${student.name}`} alt={student.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold">{student.name}</h3>
            {status && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status[2]}`}><StatusIcon size={14} /> {status[0]}</span>}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{student.department} - Year {student.year}{student.graduationYear ? ` - Grad ${student.graduationYear}` : ""}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{student.bio || student.reason || "Ready to collaborate on campus projects."}</p>
      {student.reason && <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">Why recommended: {student.reason}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(student.skills || []).slice(0, 4).map((skill) => <span key={skill} className="tag">{skill}</span>)}
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
}
