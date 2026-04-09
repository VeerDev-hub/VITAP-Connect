import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bell, BrainCircuit, CheckCircle2, Compass, Network, Search, ShieldCheck, Sparkles, Upload, Users } from "lucide-react";
import GraphPreview from "../components/GraphPreview";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 }
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
};

const features = [
  ["Find study partners", "Connect with classmates who share your interests, courses, and academic goals.", Search],
  ["Smart matching", "Get personalized recommendations based on your skills, clubs, and project preferences.", BrainCircuit],
  ["Project collaboration", "Form study groups and teams for assignments, hackathons, and research projects.", Users],
  ["Safe campus community", "Verified VITAP University students with moderated profiles and secure messaging.", ShieldCheck]
];

const journey = [
  ["Create your profile", "Add your branch, year, skills, interests, clubs, and upload a profile photo.", Upload],
  ["Discover connections", "Browse and connect with students who match your academic and extracurricular interests.", Network],
  ["Build relationships", "Send connection requests, join study groups, and collaborate on projects.", Compass],
  ["Achieve together", "Work with your connections on assignments, hackathons, and campus initiatives.", CheckCircle2]
];

const stats = [
  ["500+", "Active VITAP students"],
  ["50+", "Study groups formed"],
  ["4.8", "Average user rating"]
];

const highlights = [
  "Connect with verified VITAP University students",
  "Find teammates for hackathons and projects",
  "Join study groups for better learning",
  "Secure messaging and real-time notifications"
];

function Reveal({ children, className = "" }) {
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.28),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(124,58,237,0.28),transparent_30%),linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(239,246,255,0.85)_42%,rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.24),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(124,58,237,0.24),transparent_30%),linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_48%,rgba(2,6,23,1)_100%)]" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-20 lg:min-h-[86vh] lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            <Sparkles size={16} /> VITAP University Community
          </motion.div>
          <motion.h1 variants={fadeUp} className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Connect with the right classmates for your next big project.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            VITAP Connect helps VITAP University students find study partners, form project teams, and build lasting academic relationships through shared interests and goals.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Link className="btn-primary inline-flex items-center gap-2" to="/register">Start connecting <ArrowRight size={18} /></Link>
            <Link className="btn-secondary" to="/login">Login</Link>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {stats.map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="font-display text-3xl font-bold text-blue-600 dark:text-blue-300">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div className="relative" initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }}>
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-blue-500/20 to-violet-500/20 blur-2xl" />
          <div className="card relative p-3">
            <GraphPreview />
          </div>
          <motion.div className="absolute -bottom-6 left-6 right-6 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/90" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"><Bell size={20} /></div>
              <div>
                <p className="font-semibold">New connection request</p>
                <p className="text-sm text-slate-500">A Computer Science student from your year wants to connect for the upcoming hackathon.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Reveal className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, text, Icon]) => (
            <motion.article key={title} className="card group" whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-110 dark:bg-blue-500/15 dark:text-blue-200">
                <Icon />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
            </motion.article>
          ))}
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-4 py-16">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="tag">How it works</span>
          <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">From profile to project partner in four simple steps.</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Connect with classmates who share your academic interests and form successful study groups and project teams.</p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {journey.map(([title, text, Icon], index) => (
            <Reveal key={title}>
              <div className="relative h-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
                    <Icon />
                  </div>
                  <span className="font-display text-5xl font-bold text-slate-100 dark:text-white/10">0{index + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-[2.5rem] border border-white/70 bg-slate-950 p-6 shadow-soft md:p-10 lg:grid-cols-[0.9fr_1.1fr] dark:border-white/10">
          <Reveal>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Dashboard preview</span>
            <h2 className="mt-5 font-display text-4xl font-bold text-white">Everything you need to connect and collaborate.</h2>
            <p className="mt-4 leading-7 text-slate-300">Your personalized dashboard shows recommended connections, study group invitations, project opportunities, and direct messages from classmates.</p>
          </Reveal>
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm font-semibold text-slate-100 backdrop-blur">
                  <CheckCircle2 className="mb-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-violet-600 p-8 text-white shadow-soft md:p-12">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Join the community</span>
              <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">Start building your academic network today.</h2>
              <p className="mt-4 max-w-2xl text-blue-50">Connect with fellow VITAP students, find project partners, and make the most of your university experience.</p>
            </div>
            <Link className="rounded-full bg-white px-6 py-4 font-bold text-blue-700 shadow-xl transition hover:-translate-y-1" to="/register">Create profile</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
