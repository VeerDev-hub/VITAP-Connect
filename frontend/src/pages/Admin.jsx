import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageSquare, ShieldAlert, Star, Users } from "lucide-react";
import { api } from "../services/api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [usersRes, feedbacksRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/feedback")
      ]);
      setUsers(usersRes.data.users);
      setFeedbacks(feedbacksRes.data.feedbacks);
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

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex h-96 items-center justify-center font-display text-xl font-bold">Loading admin portal...</div>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 space-y-10">
      <div>
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-rose-500" size={32} />
          <h1 className="font-display text-4xl font-bold">Admin Portal</h1>
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage campus students and review community feedback.</p>
      </div>

      {/* User Moderation Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-indigo-500" size={20} />
          <h2 className="font-display text-2xl font-bold">Student Moderation</h2>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 font-bold uppercase tracking-wider">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="p-4">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold">{user.name}</td>
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

