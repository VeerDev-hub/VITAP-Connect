import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FolderGit2, MessageSquare, ShieldAlert, Star, Users } from "lucide-react";
import { api } from "../services/api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [usersRes, feedbacksRes, projectsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/feedback"),
        api.get("/projects")
      ]);
      setUsers(usersRes.data.users);
      setFeedbacks(feedbacksRes.data.feedbacks);
      setProjects(projectsRes.data.projects);
    } catch (error) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(userId, status) {
    await api.patch(`/admin/users/${userId}/status`, { status });
    toast.success("User status updated");
    load();
  }

  async function deleteProject(projectId) {
    if (!window.confirm("Are you sure you want to delete this project group? This will also wipe its chat history.")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success("Project removed");
      load();
    } catch (error) {
      toast.error("Failed to delete project");
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex h-96 items-center justify-center font-display text-xl font-bold">Loading admin portal...</div>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 space-y-10">
      <div>
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-rose-500" size={32} />
          <h1 className="font-display text-4xl font-bold">Admin Portal</h1>
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage campus students, projects, and review community feedback.</p>
      </div>

      {/* User Moderation Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-indigo-500" size={20} />
          <h2 className="font-display text-2xl font-bold">Student Moderation</h2>
        </div>
        {/* Desktop View Table */}
        <div className="hidden md:block card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 font-bold uppercase tracking-wider">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="p-4">Reg. No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300">
                  <td className="p-4 font-mono font-bold text-slate-500">{user.regNumber || "N/A"}</td>
                  <td className="font-semibold py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-white/10" 
                        src={user.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                        alt={user.name} 
                      />
                      <span className="text-slate-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${user.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 font-medium ${user.status === "blocked" ? "text-rose-500" : "text-emerald-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.status === "blocked" ? "bg-rose-500" : "bg-emerald-500"}`} />
                      {user.status || "active"}
                    </span>
                  </td>
                  <td className="text-right p-4">
                    <button 
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${user.status === "blocked" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`} 
                      onClick={() => updateStatus(user.id, user.status === "blocked" ? "active" : "blocked")}
                    >
                      {user.status === "blocked" ? "Unblock" : "Block User"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-4">
          {users.map((user) => (
            <div key={user.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-white/10" 
                    src={user.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                    alt={user.name} 
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{user.name}</h3>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">{user.regNumber || "No Reg. No"}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${user.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {user.role}
                </span>
              </div>
              <div className="space-y-2 py-3 border-y border-slate-100 dark:border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Email</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{user.email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${user.status === "blocked" ? "text-rose-500" : "text-emerald-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${user.status === "blocked" ? "bg-rose-500" : "bg-emerald-500"}`} />
                    {user.status || "active"}
                  </span>
                </div>
              </div>
              <button 
                className={`w-full mt-3 rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${user.status === "blocked" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`} 
                onClick={() => updateStatus(user.id, user.status === "blocked" ? "active" : "blocked")}
              >
                {user.status === "blocked" ? "Unblock User" : "Restrict User Access"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Collaboration Moderation Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderGit2 className="text-blue-500" size={20} />
          <h2 className="font-display text-2xl font-bold">Collaboration Moderation</h2>
        </div>
        {/* Desktop View Table */}
        <div className="hidden md:block card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 font-bold uppercase tracking-wider">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="p-4">Type</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Members</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No project groups found.</td></tr>}
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-400">
                      {project.type}
                    </span>
                  </td>
                  <td className="font-semibold">{project.title}</td>
                  <td className="text-slate-600 dark:text-slate-300">{project.ownerName}</td>
                  <td className="text-slate-500">{project.members?.length || 0} students</td>
                  <td className="text-right p-4">
                    <button 
                      className="rounded-full bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200" 
                      onClick={() => deleteProject(project.id)}
                    >
                      Remove Collaboration
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-4">
          {projects.length === 0 && <p className="card p-8 text-center text-slate-500 text-sm italic">No active collaborations to manage.</p>}
          {projects.map((project) => (
            <div key={project.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-400">
                  {project.type}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{project.members?.length || 0} members</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{project.title}</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Lead by {project.ownerName}</p>
              <button 
                className="w-full rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30" 
                onClick={() => deleteProject(project.id)}
              >
                Terminate Collaboration
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-emerald-500" size={20} />
          <h2 className="font-display text-2xl font-bold">Community Feedback</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feedbacks.length === 0 && <p className="text-slate-500 col-span-full py-10 text-center card bg-slate-50 dark:bg-slate-900/50">No feedback submitted yet.</p>}
          {feedbacks.map((item) => (
            <div key={item._id} className="card relative group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-900 dark:text-white">{item.userName}</span>
                <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex gap-0.5 mb-3 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < item.rating ? "currentColor" : "none"} strokeWidth={i < item.rating ? 0 : 2} className={i >= item.rating ? "text-slate-300" : ""} />
                ))}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                "{item.message}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

