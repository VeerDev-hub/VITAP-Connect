import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, FolderKanban, MessageSquare, Sparkles, UserCheck, Users, X, LayoutGrid, LayoutList } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";
import DashboardWidgets from "../components/DashboardWidgets";
import { useAuth } from "../context/AuthContext";

function profileCompletion(user) {
  const fields = [user?.name, user?.department, user?.year, user?.graduationYear, user?.bio, user?.avatarUrl, user?.skills?.length, user?.interests?.length, user?.goal, user?.availability];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ recommendations: [], notifications: [], analytics: null, projects: [], connections: { requests: [], accepted: [] } });
  const [viewMode, setViewMode] = useState("single");
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

  async function clearNotifications() {
    await api.delete("/notifications/clear");
    setData((current) => ({ ...current, notifications: [] }));
    toast.success("Notifications cleared");
  }

  async function deleteNotification(id) {
    await api.delete(`/notifications/${id}`);
    setData((current) => ({ ...current, notifications: current.notifications.filter((n) => n.id !== id) }));
  }

  useEffect(() => { load(); }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="tag"
          >
            Your student hub
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-3 font-display text-5xl font-black tracking-tighter"
          >
            Welcome back, <span className="text-indigo-600">{user?.name?.split(" ")[0] || "Student"}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed"
          >
            Your personalized dashboard shows connection requests, recommendations, collaboration opportunities, and campus updates.
          </motion.p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="flex gap-2"
        >
          <Link to="/feedback" className="btn-secondary flex items-center gap-2 py-3 px-6 shadow-sm hover:shadow-md transition-all">
            <MessageSquare size={18} />
            Give Feedback
          </Link>
        </motion.div>
      </motion.div>

      <div className="mt-8">
        <DashboardWidgets />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-slate-900 text-white">
          <Sparkles />
          <p className="mt-4 text-sm font-semibold text-slate-300">Profile completeness</p>
          <p className="mt-2 font-display text-4xl font-bold">{completion}%</p>
          <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-white" style={{ width: `${completion}%` }} /></div>
        </div>
        <div className="card"><Users className="text-blue-600" /><p className="mt-4 text-sm text-slate-500">Campus students</p><p className="font-display text-4xl font-bold">{data.analytics?.students || 0}</p></div>
        <div className="card"><UserCheck className="text-emerald-600" /><p className="mt-4 text-sm text-slate-500">Your friends</p><p className="font-display text-4xl font-bold">{data.connections.accepted.length}</p></div>
        <div className="card"><Bell className="text-amber-500" /><p className="mt-4 text-sm text-slate-500">Pending requests</p><p className="font-display text-4xl font-bold">{data.connections.requests.length}</p></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="font-display text-2xl font-bold"
              >
                Recommended collaborators
              </motion.h2>
              <p className="mt-1 text-sm text-slate-500">Students who match your skills, interests, and academic goals.</p>
            </div>
            
            <div className="flex items-center rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              <button 
                onClick={() => setViewMode("single")} 
                className={`p-1.5 rounded-full transition ${viewMode === "single" ? "bg-white text-slate-900 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-white/10" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`} 
                aria-label="Single Column View"
              >
                <LayoutList size={14} />
              </button>
              <button 
                onClick={() => setViewMode("double")} 
                className={`p-1.5 rounded-full transition ${viewMode === "double" ? "bg-white text-slate-900 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-white/10" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                aria-label="Double Column View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`mt-5 grid gap-4 transition-all duration-300 ${viewMode === "double" ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}
          >
            {data.recommendations.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10 md:col-span-2">Add more skills and interests to unlock better recommendations.</p>}
            {data.recommendations.map((student) => {
              // Priority: if already sent/received status exists from backend, use it.
              return <StudentCard key={student.id} student={student} compact={viewMode === "double"} onAction={request} />;
            })}
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-display text-2xl font-bold">Venture Matches</h2>
            <div className="mt-4 space-y-3">
              {data.projects.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10">No venture matches yet. Join or initiate collaborations to find partners with complementary skills.</p>}
              {data.projects.map((project) => <div key={project.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700 bg-white/50 dark:bg-white/5"><FolderKanban className="text-indigo-600 dark:text-indigo-400" /><p className="mt-2 font-bold text-slate-900 dark:text-white">{project.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">Skill overlap: {(project.matchingSkills || []).join(", ") || "Active Match"}</p></div>)}
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">Notifications</h2>
              {data.notifications.length > 0 && <button className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={clearNotifications}>Clear all</button>}
            </div>
            <div className="mt-4 space-y-3">
              {data.notifications.length === 0 && <p className="text-sm text-slate-500">No new notifications.</p>}
              {data.notifications.map((item) => {
                const isCollaboration = item.message.toLowerCase().includes("project") || item.message.toLowerCase().includes("collaboration");
                const cleanMessage = item.message.replace(/project/gi, "collaboration");
                return (
                  <div key={item.id} className="group relative rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
                    <p>{cleanMessage}</p>
                    <button className="absolute right-2 top-2 hidden text-slate-400 hover:text-rose-500 group-hover:block" onClick={() => deleteNotification(item.id)} title="Delete notification"><X size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
