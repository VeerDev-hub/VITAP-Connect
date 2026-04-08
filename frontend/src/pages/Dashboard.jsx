import { useEffect, useState } from "react";
import { Bell, CheckCircle2, FolderKanban, Sparkles, UserCheck, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";
import { useAuth } from "../context/AuthContext";

function profileCompletion(user) {
  const fields = [user?.name, user?.department, user?.year, user?.graduationYear, user?.bio, user?.avatarUrl, user?.skills?.length, user?.interests?.length, user?.goal, user?.availability];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ recommendations: [], notifications: [], analytics: null, projects: [], connections: { requests: [], accepted: [] } });
  const completion = profileCompletion(user);

  async function load() {
    const [recommendations, notifications, analytics, projects, connections] = await Promise.all([
      api.get("/users/recommendations"),
      api.get("/notifications"),
      api.get("/analytics/summary"),
      api.get("/projects/recommendations"),
      api.get("/connections")
    ]);
    setData({
      recommendations: recommendations.data.users,
      notifications: notifications.data.notifications,
      analytics: analytics.data.summary,
      projects: projects.data.projects,
      connections: connections.data
    });
  }

  async function request(student) {
    await api.post("/connections/request", { toUserId: student.id });
    toast.success(`Connection request sent to ${student.name}`);
    setData((current) => ({ ...current, recommendations: current.recommendations.map((item) => item.id === student.id ? { ...item, connectionStatus: "requestSent" } : item) }));
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="tag">Live student workspace</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "Student"}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Your dashboard updates from Neo4j: profile quality, requests, recommendations, and project matches.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-blue-600 to-violet-600 text-white">
          <Sparkles />
          <p className="mt-4 text-sm font-semibold text-blue-100">Profile completeness</p>
          <p className="mt-2 font-display text-4xl font-bold">{completion}%</p>
          <div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-white" style={{ width: `${completion}%` }} /></div>
        </div>
        <div className="card"><Users className="text-blue-600" /><p className="mt-4 text-sm text-slate-500">Campus students</p><p className="font-display text-4xl font-bold">{data.analytics?.students || 0}</p></div>
        <div className="card"><UserCheck className="text-emerald-600" /><p className="mt-4 text-sm text-slate-500">Your friends</p><p className="font-display text-4xl font-bold">{data.connections.accepted.length}</p></div>
        <div className="card"><Bell className="text-amber-500" /><p className="mt-4 text-sm text-slate-500">Pending requests</p><p className="font-display text-4xl font-bold">{data.connections.requests.length}</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Recommended collaborators</h2>
              <p className="mt-1 text-sm text-slate-500">Each card explains why the graph recommended this student.</p>
            </div>
            <CheckCircle2 className="text-emerald-500" />
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {data.recommendations.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10 md:col-span-2">Add more skills and interests to unlock better recommendations.</p>}
            {data.recommendations.map((student) => <StudentCard key={student.id} student={student} onAction={request} />)}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-display text-2xl font-bold">Project matches</h2>
            <div className="mt-4 space-y-3">
              {data.projects.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10">No project match yet. Create projects with required skills to see suggestions here.</p>}
              {data.projects.map((project) => <div key={project.id} className="rounded-3xl border border-slate-200 p-4 dark:border-white/10"><FolderKanban className="text-blue-600" /><p className="mt-2 font-semibold">{project.title}</p><p className="text-xs text-slate-500">Matches: {(project.matchingSkills || []).join(", ") || "Skill overlap"}</p></div>)}
            </div>
          </div>
          <div className="card">
            <h2 className="font-display text-2xl font-bold">Notifications</h2>
            <div className="mt-4 space-y-3">
              {data.notifications.map((item) => <p key={item.id} className="rounded-2xl bg-blue-50 p-3 text-sm dark:bg-blue-500/15">{item.message}</p>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
