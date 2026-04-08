import { useEffect, useState } from "react";
import { Check, UserCheck, UserMinus, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";

function RequestCard({ student, onAccept, onReject }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex items-start gap-4">
        <img className="h-14 w-14 rounded-2xl object-cover" src={student.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${student.name}`} alt={student.name} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold">{student.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{student.department} - Year {student.year}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Wants to connect and collaborate with you.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(student.skills || []).slice(0, 4).map((skill) => <span key={skill} className="tag">{skill}</span>)}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="btn-primary inline-flex items-center justify-center gap-2" onClick={() => onAccept(student)}><Check size={18} /> Accept</button>
        <button className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200" onClick={() => onReject(student)}><X className="mr-2 inline" size={18} /> Reject</button>
      </div>
    </article>
  );
}

export default function Connections() {
  const [connections, setConnections] = useState({ requests: [], accepted: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await api.get("/connections");
    setConnections(data);
    setLoading(false);
  }

  async function accept(student) {
    await api.post("/connections/accept", { fromUserId: student.id });
    toast.success(`You are now connected with ${student.name}`);
    load();
  }

  async function reject(student) {
    await api.post("/connections/reject", { fromUserId: student.id });
    toast.success(`Request from ${student.name} rejected`);
    load();
  }

  async function removeFriend(student) {
    await api.post("/connections/remove", { friendId: student.id });
    toast.success(`${student.name} removed from your friends`);
    load();
  }

  async function blockFriend(student) {
    await api.post("/connections/block", { friendId: student.id });
    toast.success(`${student.name} blocked`);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="tag">Relationship center</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Connections</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Accept useful collaborators, reject requests you do not need, and keep your campus network focused.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-3xl bg-blue-50 px-5 py-4 dark:bg-blue-500/10"><UserMinus className="mx-auto text-blue-600" /><b className="mt-2 block">{connections.requests.length}</b><span className="text-xs text-slate-500">Pending</span></div>
          <div className="rounded-3xl bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10"><UserCheck className="mx-auto text-emerald-600" /><b className="mt-2 block">{connections.accepted.length}</b><span className="text-xs text-slate-500">Friends</span></div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card">
          <h2 className="font-display text-2xl font-bold">Pending requests</h2>
          <div className="mt-5 grid gap-4">
            {loading && <p className="text-sm text-slate-500">Loading requests...</p>}
            {!loading && connections.requests.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10">No pending requests right now.</p>}
            {connections.requests.map((student) => <RequestCard key={student.id} student={student} onAccept={accept} onReject={reject} />)}
          </div>
        </div>
        <div className="card">
          <h2 className="font-display text-2xl font-bold">Your network</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {loading && <p className="text-sm text-slate-500">Loading connections...</p>}
            {!loading && connections.accepted.length === 0 && <p className="rounded-3xl bg-slate-100 p-5 text-sm text-slate-500 dark:bg-white/10 md:col-span-2">No accepted connections yet. Visit Discover to send requests.</p>}
            {connections.accepted.map((student) => <StudentCard key={student.id} student={{ ...student, connectionStatus: "friend" }} secondaryActionLabel="Remove" onSecondaryAction={removeFriend} dangerActionLabel="Block" onDangerAction={blockFriend} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
