import { memo, useState } from "react";
import { CheckCircle2, Clock3, Github, Instagram, Linkedin, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

const statusCopy = {
  friend: ["Friends", CheckCircle2, "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"],
  requestSent: ["Request sent", Clock3, "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"],
  requestReceived: ["Requested you", UserPlus, "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"]
};

// Animation variants for staggered list
const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 15 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 15, stiffness: 100 }
  }
};

export default memo(function StudentCard({ student, compact = false, actionLabel = "Connect", onAction, secondaryActionLabel, onSecondaryAction, dangerActionLabel, onDangerAction }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = student.connectionStatus && statusCopy[student.connectionStatus];
  const StatusIcon = status?.[1];
  const canAct = onAction && (!student.connectionStatus || student.connectionStatus === "none");

  return (
    <motion.article 
      variants={itemVariants}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className={`card cursor-pointer transition-all duration-300 ${compact ? "!p-4" : ""} ${isExpanded ? "ring-2 ring-slate-200 dark:ring-white/10" : "hover:-translate-y-1"}`}
      onClick={(e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <div className={`flex ${compact ? "flex-col items-center text-center gap-2" : "items-start gap-4"}`}>
        <img loading="lazy" className={`${compact ? "h-14 w-14 rounded-2xl mb-1" : "h-14 w-14 rounded-2xl"} object-cover flex-shrink-0`} src={student.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(student.name)}`} alt={student.name} />
        <div className={`min-w-0 flex-1 ${compact ? "w-full" : ""}`}>
          <div className={`flex flex-wrap items-center ${compact ? "justify-center" : ""} gap-1 sm:gap-2`}>
            <h3 className={`font-display font-bold ${compact ? "text-lg w-full" : "text-xl"} truncate`}>{student.name}</h3>
            {!compact && student.regNumber && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:bg-white/10">{student.regNumber}</span>}
            {!compact && status && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status[2]}`}><StatusIcon size={14} /> {status[0]}</span>}
          </div>
          <p className={`${compact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 truncate`}>{student.department} - Y{student.year}{student.graduationYear ? ` ('${String(student.graduationYear).slice(-2)})` : ""}</p>
        </div>
        <div className={`text-slate-400 ${compact ? "hidden" : ""}`}>
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
        <div className={`mt-5 grid gap-2 sm:gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
           {canAct && <button className={`btn-secondary ${compact ? "" : "sm:col-span-2"} ${compact ? "!py-2 text-xs" : ""}`} onClick={() => onAction(student)}>{actionLabel}</button>}
          {onSecondaryAction && <button className="btn-secondary" onClick={() => onSecondaryAction(student)}>{secondaryActionLabel}</button>}
          {onDangerAction && <button className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200" onClick={() => onDangerAction(student)}>{dangerActionLabel}</button>}
        </div>
      )}
    </motion.article>
  );
});
