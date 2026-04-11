import { useEffect, useState } from "react";
import { Check, UserCheck, UserMinus, X, Sparkles, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";
import { motion, AnimatePresence } from "framer-motion";

function RequestCard({ student, onAccept, onReject }) {
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-5 transition-all dark:border-indigo-500/20 dark:bg-indigo-500/5"
    >
      <div className="flex items-start gap-4">
        <img className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800" src={student.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(student.name)}`} alt={student.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white truncate">{student.name}</h3>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{student.department} • Year {student.year}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">Interested in collaboration and networking with you.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(student.skills || []).slice(0, 3).map((skill) => (
          <span key={skill} className="px-2.5 py-1 bg-white dark:bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-6 grid gap-3 grid-cols-2">
        <button className="btn-primary !py-2.5 flex items-center justify-center gap-2 text-sm" onClick={() => onAccept(student)}><Check size={16} /> Accept</button>
        <button className="rounded-full border border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400" onClick={() => onReject(student)}><X size={16} /> Ignore</button>
      </div>
    </motion.article>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

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
    toast.success(`Connected with ${student.name}`);
    load();
  }

  async function reject(student) {
    await api.post("/connections/reject", { fromUserId: student.id });
    toast.success(`Request ignored`);
    load();
  }

  async function removeFriend(student) {
    await api.post("/connections/remove", { friendId: student.id });
    toast.success(`${student.name} removed`);
    load();
  }

  async function blockFriend(student) {
    await api.post("/connections/block", { friendId: student.id });
    toast.success(`${student.name} blocked`);
    load();
  }

  useEffect(() => { load(); }, []);

  const hasRequests = connections.requests.length > 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-2xl">
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest"
          >
            <Sparkles size={12} /> Relationship Center
          </motion.span>
          <h1 className="mt-4 font-display text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Your Network</h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed italic">
            "Your network is your net worth." Build meaningful collaborations across the VIT-AP campus.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="card !p-4 flex flex-col items-center min-w-[100px] border-emerald-500/20 bg-emerald-500/5">
            <UserCheck className="text-emerald-500 mb-1" size={20} />
            <span className="text-2xl font-black text-slate-900 dark:text-white">{connections.accepted.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
          </div>
          {hasRequests && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card !p-4 flex flex-col items-center min-w-[100px] border-amber-500/20 bg-amber-500/5"
            >
              <UserMinus className="text-amber-500 mb-1" size={20} />
              <span className="text-2xl font-black text-slate-900 dark:text-white">{connections.requests.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className={`mt-12 transition-all duration-700 grid gap-8 ${hasRequests ? 'lg:grid-cols-[400px_1fr]' : 'grid-cols-1'}`}>
        <AnimatePresence>
          {hasRequests && (
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30, width: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  Incoming Requests
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{connections.requests.length}</span>
                </h2>
              </div>
              <div className="grid gap-4">
                {connections.requests.map((student) => (
                  <RequestCard key={student.id} student={student} onAccept={accept} onReject={reject} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Your Professional Circle</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5 mx-6 hidden sm:block" />
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid gap-5 ${hasRequests ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}
          >
            {loading ? (
               [1,2,3].map(i => <div key={i} className="h-40 card animate-pulse bg-slate-100 dark:bg-white/5" />)
            ) : connections.accepted.length === 0 ? (
              <div className="col-span-full py-16 text-center card bg-slate-50 dark:bg-white/5 border-dashed">
                <ShieldAlert className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Your circle is empty. Start discovering collaborators!</p>
              </div>
            ) : (
              connections.accepted.map((student) => (
                <StudentCard 
                  key={student.id} 
                  student={{ ...student, connectionStatus: "friend" }} 
                  secondaryActionLabel="Remove" 
                  onSecondaryAction={removeFriend} 
                  dangerActionLabel="Block" 
                  onDangerAction={blockFriend} 
                />
              ))
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
