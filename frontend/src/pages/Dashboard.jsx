import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CloudSun, FolderKanban, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
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
    <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
      <span className="text-line-strong">/</span>
      <span>{now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} IST</span>
      {temp !== null && (
        <>
          <span className="text-line-strong">/</span>
          <span className="inline-flex items-center gap-1"><CloudSun size={13} /> {temp}°C Amaravati</span>
        </>
      )}
    </p>
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
      <header className="border-b border-line pb-6">
        <TodayStrip />
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{greeting()}, {firstName(user?.name)}.</h1>
        <p className="mt-2 text-ink-2">
          {requests.length > 0
            ? <>You have <Link to="/connections" className="link">{requests.length} connection request{requests.length > 1 ? "s" : ""}</Link> waiting.</>
            : "Here's who you might want to work with this week."}
        </p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Profile" value={`${completion}%`} tone={completion === 100 ? "ok" : "accent"}>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-sunken"><div className="h-full bg-accent" style={{ width: `${completion}%` }} /></div>
          {completion < 100 && <Link to="/profile" className="mt-2 inline-block text-xs font-semibold text-ink-2 hover:text-ink">Complete it →</Link>}
        </Stat>
        <Stat label="Connections" value={data ? data.connections.accepted.length : "–"} />
        <Stat label="Pending" value={data ? requests.length : "–"} tone={requests.length ? "warn" : "default"} />
        <Stat label="On campus" value={data ? data.analytics?.students ?? 0 : "–"} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Recommendations */}
        <section>
          <SectionTitle
            title="Suggested for you"
            count={data?.recommendations.length}
            action={<Link to="/discover" className="btn btn-ghost btn-sm">Browse all <ArrowRight size={14} /></Link>}
          />
          {!data ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52" />)}</div>
          ) : data.recommendations.length === 0 ? (
            <EmptyState icon={Sparkles} title="No suggestions yet" action={<Link to="/profile" className="btn btn-secondary btn-sm">Add skills</Link>}>
              Add a few skills and interests to your profile so we can match you.
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recommendations.map((student) => <StudentCard key={student.id} student={student} onAction={request} />)}
            </div>
          )}
        </section>

        <aside className="space-y-10">
          {requests.length > 0 && (
            <section>
              <SectionTitle title="Requests" count={requests.length} action={<Link to="/connections" className="btn btn-ghost btn-sm">Review</Link>} />
              <div className="panel divide-y divide-line">
                {requests.slice(0, 4).map((s) => (
                  <Link key={s.id} to="/connections" className="flex items-center gap-3 px-4 py-3 hover:bg-sunken">
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
              <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-2">
                No skill matches right now. <Link to="/collaborations" className="link">Start a project</Link>
              </p>
            ) : (
              <div className="panel divide-y divide-line">
                {data.projects.map((p) => (
                  <Link key={p.id} to="/collaborations" className="block px-4 py-3 hover:bg-sunken">
                    <p className="flex items-center gap-2 text-sm font-semibold"><FolderKanban size={14} className="text-ink-3" /> {p.title}</p>
                    <p className="mt-1 text-xs text-ink-2">Needs {(p.matchingSkills || []).join(", ")}</p>
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
              <ol className="relative space-y-4 border-l border-line pl-4">
                {data.notifications.map((n) => (
                  <li key={n.id} className="group relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-bg bg-accent" />
                    <p className="pr-6 text-sm">{n.message}</p>
                    <p className="font-mono text-[11px] text-ink-3">{timeAgo(n.createdAt)}</p>
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
