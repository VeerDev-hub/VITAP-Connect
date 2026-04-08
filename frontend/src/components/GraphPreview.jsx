import { ArrowRight, BadgeCheck, BookOpen, Code2, Users } from "lucide-react";

const steps = [
  {
    label: "You",
    detail: "CSE - Year 3",
    icon: BadgeCheck,
    tone: "from-blue-600 to-cyan-500"
  },
  {
    label: "React skill",
    detail: "Shared skill match",
    icon: Code2,
    tone: "from-violet-600 to-fuchsia-500"
  },
  {
    label: "AI Club",
    detail: "Same campus group",
    icon: Users,
    tone: "from-amber-500 to-orange-500"
  },
  {
    label: "Project partner",
    detail: "Recommended teammate",
    icon: BookOpen,
    tone: "from-emerald-500 to-teal-500"
  }
];

export default function GraphPreview() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-violet-100 p-5 dark:border-white/10 dark:from-slate-900 dark:via-blue-950/50 dark:to-violet-950/40">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-violet-400/20 blur-3xl" />

      <div className="relative">
        <span className="tag">Shortest connection path</span>
        <h2 className="mt-4 font-display text-2xl font-bold">How students discover each other</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Neo4j can explain why a person is recommended by tracing skills, clubs, mutual friends, and project links.
        </p>

        <div className="mt-6 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.tone} text-white shadow-lg`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step.detail}</p>
                </div>
                {index < steps.length - 1 && <ArrowRight className="hidden text-blue-500 sm:block" size={20} />}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100 shadow-xl dark:bg-black/50">
          MATCH path = shortestPath((you)-[:FRIEND_OF|HAS_SKILL|MEMBER_OF*..4]-(partner))
        </div>
      </div>
    </div>
  );
}
