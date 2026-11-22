import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Mini graph illustration: the student graph the recommender actually walks.
const NODES = [
  { id: "you", label: "You", x: 210, y: 170, kind: "you" },
  { id: "priya", label: "Priya · Y3", x: 370, y: 90, kind: "student" },
  { id: "karthik", label: "Karthik · Y2", x: 360, y: 270, kind: "student" },
  { id: "react", label: "React", x: 70, y: 80, kind: "skill" },
  { id: "neo4j", label: "Neo4j", x: 250, y: 40, kind: "skill" },
  { id: "ai", label: "AI Club", x: 60, y: 260, kind: "club" },
  { id: "hack", label: "HackFest", x: 200, y: 320, kind: "project" }
];
const EDGES = [["you", "react"], ["you", "neo4j"], ["you", "ai"], ["priya", "neo4j"], ["priya", "react"], ["karthik", "ai"], ["karthik", "hack"], ["you", "hack"], ["you", "priya"]];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function GraphIllustration() {
  return (
    <svg viewBox="0 0 440 360" className="h-auto w-full" role="img" aria-label="A student graph connecting you to classmates through shared skills, clubs and projects">
      {EDGES.map(([a, b]) => {
        const from = byId[a];
        const to = byId[b];
        const strong = a === "you" && b === "priya";
        return (
          <line key={a + b} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            className={strong ? "stroke-accent" : "stroke-line-strong"}
            strokeWidth={strong ? 2 : 1.25} strokeDasharray={strong ? "5 4" : undefined} />
        );
      })}
      {NODES.map((n) => {
        const isYou = n.kind === "you";
        const isPerson = n.kind === "student" || isYou;
        const w = n.label.length * 7.2 + 22;
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            {isPerson ? (
              <rect x={-w / 2} y={-15} width={w} height={30} rx={6} className={isYou ? "fill-ink" : "fill-surface stroke-ink"} strokeWidth={1.25} />
            ) : (
              <rect x={-w / 2} y={-13} width={w} height={26} rx={13} className="fill-sunken stroke-line-strong" strokeWidth={1} />
            )}
            <text textAnchor="middle" dominantBaseline="central" className={`${isYou ? "fill-bg" : "fill-ink"} font-mono`} fontSize={isPerson ? 12 : 11} fontWeight={500}>
              {n.label}
            </text>
          </g>
        );
      })}
      <g transform="translate(300 140)">
        <rect x={-4} y={-11} width={86} height={22} rx={4} className="fill-accent" />
        <text x={39} textAnchor="middle" dominantBaseline="central" className="fill-accent-ink font-mono" fontSize={11} fontWeight={600}>score 9</text>
      </g>
    </svg>
  );
}

const SIGNALS = [
  ["Shared skill", "×3", "You both list React or Neo4j"],
  ["Shared interest", "×2", "Both into AI, startups, open source…"],
  ["Same department", "+2", "Same branch, same lab corridors"],
  ["Mutual connection", "+1", "Each friend you have in common"],
  ["Same year", "+1", "Taking the same courses right now"]
];

const FEATURES = [
  ["Discover", "Search everyone on campus by name, registration number, skill, department or year."],
  ["Collaborations", "Post a project or hackathon team, list the skills you need, and accept join requests."],
  ["Messages", "Direct messages, group chats and a channel for every project — with read receipts."],
  ["Calls", "One-click voice and video calls with screen sharing, right from a chat or project room."]
];

export default function Home() {
  const { user } = useAuth();
  const primary = user ? { to: "/dashboard", label: "Open your dashboard" } : { to: "/register", label: "Join with your college email" };

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-accent" /> For VIT-AP students</p>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">
              Find the classmate who can build the other half.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              VITAP Connect maps who knows what across campus, then points you to the teammates your project is missing. No group-chat spam, no cold DMs to strangers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primary.to} className="btn btn-accent btn-lg">{primary.label} <ArrowRight size={16} /></Link>
              {!user && <Link to="/login" className="btn btn-secondary btn-lg">I already have an account</Link>}
            </div>
            <p className="mt-6 font-mono text-xs text-ink-3">Sign-up needs an @vitapstudent.ac.in address · Free</p>
          </div>
          <div className="grid-paper rounded-xl border border-line bg-surface p-4 sm:p-6">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-ink-3">
              <span>match_graph.cypher</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> live</span>
            </div>
            <GraphIllustration />
          </div>
        </div>
      </section>

      {/* How matching works */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="eyebrow text-accent">How matching works</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Recommendations you can actually read.</h2>
            <p className="mt-4 text-ink-2">
              Every student, skill, club and project is a node in a Neo4j graph. To rank people for you, we walk that graph and add up a simple score — and we tell you which signal put someone on your list.
            </p>
          </div>
          <div className="panel overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] border-b border-line bg-sunken px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <span>Signal</span>
              <span className="hidden sm:block">Example</span>
              <span>Weight</span>
            </div>
            {SIGNALS.map(([signal, weight, example]) => (
              <div key={signal} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[1fr_1.4fr_auto]">
                <span className="font-semibold">{signal}</span>
                <span className="hidden text-sm text-ink-2 sm:block">{example}</span>
                <span className="font-mono text-lg font-medium text-accent">{weight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="eyebrow">What&apos;s inside</p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {FEATURES.map(([title, text], i) => (
              <div key={title} className="bg-surface p-6 sm:p-8">
                <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
                <p className="mt-2 text-ink-2">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:py-20">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold sm:text-4xl">Your next teammate is probably two buildings away.</h2>
          <Link to={primary.to} className="btn btn-primary btn-lg">{user ? "Go to dashboard" : "Create your profile"} <ArrowUpRight size={16} /></Link>
        </div>
      </section>
    </>
  );
}
