import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Avatar, Badge, EmptyState, PageHeader, Spinner, Stat } from "../components/ui";
import { apiErrorMessage, shortDate } from "../lib/format";
import { api } from "../services/api";

const TABS = [
  ["students", "Students"],
  ["projects", "Projects"],
  ["feedback", "Feedback"]
];

function Students({ users, onToggle }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return term ? users.filter((u) => [u.name, u.email, u.regNumber].some((v) => v?.toLowerCase().includes(term))) : users;
  }, [users, q]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-9" placeholder="Filter by name, email, reg. no." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-sunken font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Reg. no.</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((u) => {
              const blocked = u.status === "blocked";
              return (
                <tr key={u.id} className="hover:bg-sunken/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{u.name} {u.role === "admin" && <Badge tone="accent" className="ml-1">admin</Badge>}</p>
                        <p className="truncate text-xs text-ink-3">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">{u.regNumber || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{u.department || "—"}</td>
                  <td className="px-4 py-3"><Badge tone={blocked ? "bad" : "ok"}>{blocked ? "Blocked" : "Active"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "admin" && (
                      <button type="button" className={`btn btn-sm ${blocked ? "btn-secondary" : "btn-danger"}`} onClick={() => onToggle(u)}>
                        {blocked ? "Unblock" : "Block"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-3">No students match.</p>}
      </div>
    </div>
  );
}

function Projects({ projects, onDelete }) {
  if (!projects.length) return <EmptyState title="No projects yet" />;
  return (
    <div className="panel divide-y divide-line">
      {projects.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold"><Badge>{p.type || "Project"}</Badge> <span className="truncate">{p.title}</span></p>
            <p className="mt-1 text-sm text-ink-2">Led by {p.ownerName || "unknown"} · {p.members?.length || 0} members · created {shortDate(p.createdAt)}</p>
          </div>
          <button type="button" className="btn btn-danger btn-sm self-start sm:self-auto" onClick={() => onDelete(p)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function FeedbackList({ feedbacks }) {
  if (!feedbacks.length) return <EmptyState title="No feedback yet" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {feedbacks.map((f) => (
        <figure key={f._id} className="panel-pad">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-medium text-accent">{f.rating}/5</span>
            <span className="font-mono text-[11px] text-ink-3">{shortDate(f.createdAt)}</span>
          </div>
          <blockquote className="mt-3 text-ink-2">{f.message}</blockquote>
          <figcaption className="mt-3 text-sm font-semibold">— {f.userName}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("students");
  const [data, setData] = useState(null);

  async function load() {
    try {
      const [users, feedbacks, projects] = await Promise.all([api.get("/admin/users"), api.get("/feedback"), api.get("/projects")]);
      setData({ users: users.data.users, feedbacks: feedbacks.data.feedbacks, projects: projects.data.projects });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load admin data"));
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleUser(user) {
    const next = user.status === "blocked" ? "active" : "blocked";
    if (next === "blocked" && !window.confirm(`Block ${user.name}? They won't be able to log in.`)) return;
    await api.patch(`/admin/users/${user.id}/status`, { status: next });
    toast.success(next === "blocked" ? `${user.name} blocked` : `${user.name} unblocked`);
    load();
  }

  async function deleteProject(project) {
    if (!window.confirm(`Remove "${project.title}" and its chat history?`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success("Project removed");
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not remove project"));
    }
  }

  if (!data) return <Spinner label="Loading admin data" />;

  const avg = data.feedbacks.length ? (data.feedbacks.reduce((s, f) => s + f.rating, 0) / data.feedbacks.length).toFixed(1) : "–";
  const counts = { students: data.users.length, projects: data.projects.length, feedback: data.feedbacks.length };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Moderation" title="Admin" description="Manage student accounts, remove projects, and read feedback." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={data.users.length} />
        <Stat label="Blocked" value={data.users.filter((u) => u.status === "blocked").length} tone="warn" />
        <Stat label="Projects" value={data.projects.length} />
        <Stat label="Avg. rating" value={avg} tone="accent" />
      </div>

      <div className="flex gap-1 border-b border-line">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
            {label} <span className="ml-1 font-mono text-[11px] text-ink-3">{counts[key]}</span>
          </button>
        ))}
      </div>

      {tab === "students" && <Students users={data.users} onToggle={toggleUser} />}
      {tab === "projects" && <Projects projects={data.projects} onDelete={deleteProject} />}
      {tab === "feedback" && <FeedbackList feedbacks={data.feedbacks} />}
    </div>
  );
}
