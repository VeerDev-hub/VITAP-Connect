import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CloudSun, FolderKanban, Sparkles, X, Clock3, GraduationCap, Plus, Search, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "motion/react";
import { SplitText, Stagger } from "../components/motion";
import StudentCard from "../components/StudentCard";
import { Avatar, EmptyState, SectionTitle, Skeleton, Stat } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, firstName, timeAgo } from "../lib/format";
import { api } from "../services/api";

const CAMPUS = { lat: 16.5062, lon: 80.648 };

function profileCompletion(user) {
  const fields = [user?.name, user?.department, user?.year, user?.graduationYear, user?.bio, user?.avatarUrl, user?.skills?.length, user?.interests?.length, user?.goal, user?.availability];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function TodayStrip() {
  const [now, setNow] = useState(new Date());
  const [temp, setTemp] = useState(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CAMPUS.lat}&longitude=${CAMPUS.lon}&current_weather=true`)
      .then((r) => r.json())
      .then((d) => setTemp(Math.round(d.current_weather.temperature)))
      .catch(() => {});
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 text-xs font-bold text-ink-2">
      <span className="rounded-full border border-line bg-surface/60 px-3 py-1.5">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
      <span className="rounded-full border border-line bg-surface/60 px-3 py-1.5 tabular-nums">{now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} IST</span>
      {temp !== null && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pop px-3 py-1.5 text-pop-ink"><CloudSun size={13} /> {temp}°C Amaravati</span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const completion = profileCompletion(user);

  useEffect(() => {
    Promise.all([
      api.get("/users/recommendations"),
      api.get("/notifications"),
      api.get("/analytics/summary"),
      api.get("/projects/recommendations"),
      api.get("/connections")
    ])
      .then(([recommendations, notifications, analytics, projects, connections]) =>
        setData({
          recommendations: recommendations.data.users,
          notifications: notifications.data.notifications,
          analytics: analytics.data.summary,
          projects: projects.data.projects,
          connections: connections.data
        })
      )
      .catch((error) => toast.error(apiErrorMessage(error, "Could not load your dashboard")));
  }, []);

  async function request(student) {
    await api.post("/connections/request", { toUserId: student.id });
    toast.success(`Request sent to ${student.name}`);
    setData((d) => ({ ...d, recommendations: d.recommendations.map((s) => (s.id === student.id ? { ...s, connectionStatus: "requestSent" } : s)) }));
  }

  async function deleteNotification(id) {
    setData((d) => ({ ...d, notifications: d.notifications.filter((n) => n.id !== id) }));
    await api.delete(`/notifications/${id}`).catch(() => {});
  }

  async function clearNotifications() {
    setData((d) => ({ ...d, notifications: [] }));
    await api.delete("/notifications/clear").catch(() => {});
  }

  const requests = data?.connections.requests || [];

  return (
    <div className="space-y-10">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="dark relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#121a3d] via-[#0b1028] to-[#070a16] px-6 py-8 text-ink ring-1 ring-white/10 sm:px-10 sm:py-10"
      >
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="absolute -right-10 -top-20 h-64 w-64 animate-float rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-pop/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <TodayStrip />
            <h1 className="mt-4 text-3xl leading-[1.1] sm:text-[2.7rem]">
              <SplitText text={`${greeting()}, ${firstName(user?.name)}.`} />
            </h1>
            <p className="mt-3 max-w-lg text-ink-2">
              {requests.length > 0
                ? <>You have <Link to="/connections" className="font-bold text-pop underline decoration-pop/40 underline-offset-4">{requests.length} connection request{requests.length > 1 ? "s" : ""}</Link> waiting.</>
                : "Here's who you might want to work with this week."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/discover" className="btn btn-accent"><Search size={16} /> Find teammates</Link>
            <Link to="/collaborations" className="btn border border-line text-ink hover:border-pop/60 hover:text-pop"><Plus size={16} /> New project</Link>
          </div>
        </div>
      </motion.header>

      {/* Stats */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4" delay={0.15}>
        <Stat label="Profile" icon={UserRound} value={`${completion}%`} tone={completion === 100 ? "ok" : "accent"}>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunken">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-pop" initial={{ width: 0 }} animate={{ width: `${completion}%` }} transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          {completion < 100 && <Link to="/profile" className="mt-2 inline-block text-xs font-bold text-accent">Complete it →</Link>}
        </Stat>
        <Stat label="Connections" icon={Users} value={data ? data.connections.accepted.length : "–"} />
        <Stat label="Pending" icon={Clock3} value={data ? requests.length : "–"} tone={requests.length ? "warn" : "default"} />
        <Stat label="On campus" icon={GraduationCap} value={data ? data.analytics?.students ?? 0 : "–"} />
      </Stagger>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Recommendations */}
        <section>
          <SectionTitle
            title="Suggested for you"
            count={data?.recommendations.length}
            action={<Link to="/discover" className="btn btn-ghost btn-sm">Browse all <ArrowRight size={14} /></Link>}
          />
          {!data ? (
            <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-60" />)}</div>
          ) : data.recommendations.length === 0 ? (
            <EmptyState icon={Sparkles} title="No suggestions yet" action={<Link to="/profile" className="btn btn-secondary btn-sm">Add skills</Link>}>
              Add a few skills and interests to your profile so we can match you.
            </EmptyState>
          ) : (
            <Stagger className="grid gap-4 sm:grid-cols-2" gap={0.07}>
              {data.recommendations.map((student) => <StudentCard key={student.id} student={student} onAction={request} />)}
            </Stagger>
          )}
        </section>

        <aside className="space-y-10">
          {requests.length > 0 && (
            <section>
              <SectionTitle title="Requests" count={requests.length} action={<Link to="/connections" className="btn btn-ghost btn-sm">Review</Link>} />
              <div className="panel overflow-hidden p-2">
                {requests.slice(0, 4).map((s) => (
                  <Link key={s.id} to="/connections" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:translate-x-1 hover:bg-sunken">
                    <Avatar name={s.name} src={s.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-ink-3">{s.department}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle title="Projects that need you" count={data?.projects.length} />
            {!data ? (
              <Skeleton className="h-24" />
            ) : data.projects.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-line-strong p-5 text-sm text-ink-2">
                No skill matches right now. <Link to="/collaborations" className="link">Start a project</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {data.projects.map((p) => (
                  <Link key={p.id} to="/collaborations" className="panel lift flex items-center gap-3 p-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><FolderKanban size={17} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{p.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-2">Needs <b className="text-accent">{(p.matchingSkills || []).join(", ")}</b></span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              title="Activity"
              action={data?.notifications.length > 0 && <button type="button" onClick={clearNotifications} className="btn btn-ghost btn-sm">Clear</button>}
            />
            {!data ? (
              <Skeleton className="h-32" />
            ) : data.notifications.length === 0 ? (
              <p className="text-sm text-ink-3">Nothing new.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-line pl-4">
                {data.notifications.map((n) => (
                  <li key={n.id} className="group relative">
                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-[3px] border-bg bg-accent" />
                    <p className="pr-6 text-sm">{n.message}</p>
                    <p className="text-xs text-ink-3">{timeAgo(n.createdAt)} ago</p>
                    <button type="button" onClick={() => deleteNotification(n.id)} className="absolute right-0 top-0 text-ink-3 opacity-0 hover:text-bad group-hover:opacity-100" aria-label="Dismiss">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
