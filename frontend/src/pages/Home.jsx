import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Compass, FolderKanban, MessageSquare, Mic, ShieldCheck, Sparkles, Video } from "lucide-react";
import Orbit from "../components/Orbit";
import { CountUp, Magnetic, Marquee, Reveal, SplitText, SpotlightCard } from "../components/motion";
import { useAuth } from "../context/AuthContext";

const SKILLS_A = ["React", "Neo4j", "Python", "Figma", "Machine Learning", "Flutter", "Node.js", "UI/UX", "IoT", "Java", "Data Science", "Cybersecurity"];
const SKILLS_B = ["Hackathons", "Open Source", "Robotics", "Startups", "Research", "Cloud", "Game Dev", "AR/VR", "Blockchain", "Embedded", "DevOps", "Product"];

const SIGNALS = [
  ["Shared skills", "×3 each", 9, "React, Neo4j, Python"],
  ["Shared interests", "×2 each", 4, "AI, Hackathons"],
  ["Same department", "+2", 2, "Computer Science"],
  ["Mutual connections", "+1 each", 1, "Priya"],
  ["Same year", "+1", 1, "3rd year"]
];

// Cursor-following light behind the hero.
function HeroGlow() {
  const x = useMotionValue(-1000), y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 80, damping: 20 }), sy = useSpring(y, { stiffness: 80, damping: 20 });
  const bg = useTransform([sx, sy], ([a, b]) => `radial-gradient(520px circle at ${a}px ${b}px, rgb(var(--accent) / 0.16), transparent 65%)`);
  useEffect(() => {
    const move = (e) => { x.set(e.clientX); y.set(e.clientY + window.scrollY); };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);
  return <motion.div className="pointer-events-none absolute inset-0" style={{ background: bg }} />;
}

function ScoreCard() {
  return (
    <SpotlightCard className="panel p-6 shadow-float sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7BDFF2] text-sm font-extrabold text-[#06343d]">PR</span>
        <div>
          <p className="font-bold">Priya Reddy</p>
          <p className="text-sm text-ink-3">CSE · 3rd year · Hackathon regular</p>
        </div>
        <span className="ml-auto rounded-full bg-pop px-3 py-1 text-xs font-extrabold text-pop-ink">Top match</span>
      </div>
      <div className="mt-6 space-y-4">
        {SIGNALS.map(([label, weight, pts, example], i) => (
          <div key={label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">{label} <span className="ml-1 font-normal text-ink-3">{example}</span></span>
              <span className="font-mono text-xs text-ink-3">{weight}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-[rgb(var(--accent)/0.6)]"
                initial={{ width: 0 }}
                whileInView={{ width: `${(pts / 9) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-7 flex items-end justify-between border-t border-line pt-5">
        <p className="text-sm font-bold text-ink-2">Match score</p>
        <p className="font-display text-5xl font-bold text-accent"><CountUp value={17} duration={1.6} /></p>
      </div>
    </SpotlightCard>
  );
}

// Live mini demos for the bento grid.
function ChipFilterDemo() {
  const chips = ["React", "Figma", "ML", "Flutter", "Neo4j", "IoT"];
  const [on, setOn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => (v + 1) % chips.length), 1300);
    return () => clearInterval(t);
  }, [chips.length]);
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <motion.span key={c} animate={{ scale: on === i ? 1.08 : 1 }} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-300 ${on === i ? "bg-accent text-accent-ink" : "bg-sunken text-ink-2"}`}>{c}</motion.span>
      ))}
    </div>
  );
}

function ChatDemo() {
  const lines = [["in", "Need a designer for HackFest 👀"], ["out", "I'm in! Figma or code?"], ["in", "Both 😄 call at 8?"]];
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % (lines.length + 2)), 1400);
    return () => clearInterval(t);
  }, [lines.length]);
  const shown = lines.slice(0, Math.min(n, lines.length));
  return (
    <div className="flex h-36 flex-col justify-end gap-2">
      <AnimatePresence initial={false}>
        {shown.map(([dir, text]) => (
          <motion.p
            key={text}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm font-semibold ${dir === "out" ? "self-end rounded-br-md bg-accent text-accent-ink" : "self-start rounded-bl-md bg-sunken"}`}
          >
            {text}
          </motion.p>
        ))}
      </AnimatePresence>
      {n < lines.length && (
        <span className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-sunken px-3.5 py-3">
          {[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-3" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
        </span>
      )}
    </div>
  );
}

function CallDemo() {
  return (
    <div className="flex items-center gap-5">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping2 rounded-full bg-ok/40" />
        <span className="absolute inset-0 animate-ping2 rounded-full bg-ok/30 [animation-delay:1.2s]" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#F4A6C6] text-sm font-extrabold text-[#4b0f29]">SN</span>
      </span>
      <div className="flex h-10 items-center gap-1">
        {Array.from({ length: 14 }, (_, i) => (
          <motion.span key={i} className="w-1.5 rounded-full bg-accent" animate={{ height: [8, 30 - (i % 5) * 4, 10, 24, 8] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.07, ease: "easeInOut" }} />
        ))}
      </div>
    </div>
  );
}

function TeamDemo() {
  const tones = ["bg-[#FFD166] text-[#4a3500]", "bg-[#7BDFF2] text-[#06343d]", "bg-[#F4A6C6] text-[#4b0f29]", "bg-[#B8F2A0] text-[#123b05]"];
  return (
    <div className="rounded-2xl border border-line bg-bg/60 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold">Campus Events Hub</p>
        <span className="rounded-full bg-pop px-2.5 py-1 text-[10px] font-extrabold text-pop-ink">HACKATHON</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["React", "Node.js", "UI Design"].map((s) => <span key={s} className="tag !py-0.5 text-[11px]">{s}</span>)}
      </div>
      <div className="mt-4 flex -space-x-2">
        {["AM", "DS", "KR", "+"].map((a, i) => (
          <motion.span
            key={a}
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 300, damping: 18 }}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold ring-2 ring-surface ${a === "+" ? "bg-accent text-accent-ink" : tones[i]}`}
          >
            {a}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, className = "", children }) {
  return (
    <SpotlightCard className={`panel flex flex-col gap-5 p-6 sm:p-7 ${className}`}>
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon size={20} /></span>
        <h3 className="mt-4 text-xl">{title}</h3>
        <p className="mt-1.5 text-ink-2">{text}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </SpotlightCard>
  );
}

export default function Home() {
  const { user } = useAuth();
  const primary = user ? { to: "/dashboard", label: "Open your dashboard" } : { to: "/register", label: "Join with college email" };

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-20 overflow-hidden pt-20">
        <div className="dot-grid mask-fade-b absolute inset-0 opacity-70" />
        <HeroGlow />
        <div className="absolute -left-32 top-40 h-72 w-72 animate-float rounded-full bg-pop/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-6 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-16">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1.5 pl-1.5 pr-4 text-xs font-bold text-ink-2 backdrop-blur">
              <span className="rounded-full bg-pop px-2 py-0.5 text-[10px] font-extrabold text-pop-ink">NEW</span>
              Built by VIT-AP students, for VIT-AP students
            </motion.p>
            <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.02] sm:text-6xl lg:text-[4.3rem]">
              <SplitText text="Find your squad on campus." wordClass={{ "squad": "marker" }} delay={0.1} />
            </h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }} className="mt-6 max-w-xl text-lg text-ink-2">
              VITAP Connect maps who knows what across campus, then points you to the teammates your project is missing. Chat, form teams and jump on calls, all in one place.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-9 flex flex-wrap items-center gap-3">
              <Magnetic><Link to={primary.to} className="btn btn-primary btn-lg">{primary.label} <ArrowRight size={17} /></Link></Magnetic>
              {!user && <Link to="/login" className="btn btn-secondary btn-lg">Log in</Link>}
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-9 flex items-center gap-3 text-sm text-ink-2">
              <div className="flex -space-x-2">
                {["bg-[#FFD166]", "bg-[#7BDFF2]", "bg-[#F4A6C6]", "bg-[#B8F2A0]"].map((c, i) => <span key={c} className={`h-8 w-8 rounded-full ring-2 ring-bg ${c}`} style={{ zIndex: 4 - i }} />)}
              </div>
              <span><b className="text-ink">Only @vitapstudent.ac.in</b> · every account is verified</span>
            </motion.div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Orbit size={500} />
          </div>
        </div>
      </section>

      {/* Skills marquee */}
      <section className="space-y-3 py-6">
        <Marquee items={SKILLS_A.map((s) => <span className="tag !bg-surface border border-line !px-4 !py-2 text-sm">{s}</span>)} />
        <Marquee reverse items={SKILLS_B.map((s) => <span className="tag !bg-accent-soft !px-4 !py-2 text-sm !text-accent">{s}</span>)} />
      </section>

      {/* How matching works */}
      <section id="how" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
        <Reveal>
          <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-pop" /> How matching works</p>
          <h2 className="mt-4 text-3xl leading-[1.1] sm:text-[2.6rem]">Suggestions that <span className="marker">explain themselves</span>.</h2>
          <p className="mt-5 text-lg text-ink-2">
            Every student, skill and project is a node in a Neo4j graph. To rank people for you, we walk that graph and add up a simple score, and we always show you why someone made your list.
          </p>
          <Link to={primary.to} className="link mt-6 inline-flex items-center gap-1">See your matches <ArrowUpRight size={16} /></Link>
        </Reveal>
        <Reveal delay={0.1}><ScoreCard /></Reveal>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-6 lg:pb-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-pop" /> Everything in one place</p>
          <h2 className="mt-4 text-3xl leading-[1.1] sm:text-[2.6rem]">From &ldquo;anyone know React?&rdquo; to a working team.</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          <Reveal delay={0.00} className="md:col-span-4"><FeatureCard className="h-full" icon={Compass} title="Discover" text="Search every student by name, registration number, skill, department or year. Results update as you type.">
            <ChipFilterDemo />
          </FeatureCard></Reveal>
          <Reveal delay={0.08} className="md:col-span-2"><FeatureCard className="h-full" icon={ShieldCheck} title="Students only" text="Sign-up needs a @vitapstudent.ac.in email and a one-time code. No randoms.">
            <span className="inline-flex items-center gap-2 rounded-full bg-pop px-3 py-1.5 text-xs font-extrabold text-pop-ink"><BadgeCheck size={14} /> Verified</span>
          </FeatureCard></Reveal>
          <Reveal delay={0.16} className="md:col-span-2"><FeatureCard className="h-full" icon={FolderKanban} title="Teams" text="Post a project or hackathon team, list the skills you need, accept requests.">
            <TeamDemo />
          </FeatureCard></Reveal>
          <Reveal delay={0.24} className="md:col-span-2"><FeatureCard className="h-full" icon={MessageSquare} title="Real-time chat" text="DMs, group chats and a room for every project, with read receipts.">
            <ChatDemo />
          </FeatureCard></Reveal>
          <Reveal delay={0.32} className="md:col-span-2"><FeatureCard className="h-full" icon={Video} title="Calls" text="Voice and video calls with screen sharing, one click from any chat.">
            <CallDemo />
            <div className="mt-4 flex gap-2 text-ink-3"><Mic size={16} /><Video size={16} /><Sparkles size={16} /></div>
          </FeatureCard></Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="px-3 pb-6 sm:px-4">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-accent px-6 py-16 text-accent-ink sm:px-12 sm:py-20">
          <div className="absolute -right-16 -top-24 h-72 w-72 animate-float rounded-full bg-pop/60 blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <h2 className="max-w-2xl text-3xl leading-[1.1] sm:text-5xl">Your next teammate is two buildings away.</h2>
            <Magnetic>
              <Link to={primary.to} className="btn btn-lg bg-pop text-pop-ink hover:brightness-105">{user ? "Go to dashboard" : "Create your profile"} <ArrowUpRight size={17} /></Link>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </>
  );
}
