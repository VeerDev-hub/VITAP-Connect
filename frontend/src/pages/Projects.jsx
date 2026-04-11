import { memo, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Check, Lightbulb, MessageSquare, Mic, Rocket, Trash2, Users, Video, X, Sparkles, Zap } from "lucide-react";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const CollaborationChat = memo(({ project, user }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!project?.id || !project.isMember) return;
    let mounted = true;

    api.get(`/projects/${project.id}/messages`).then(({ data }) => {
      if (mounted) setMessages(data.messages || []);
    });

    if (!socket.connected) socket.connect();
    socket.emit("project:join", { projectId: project.id });

    const handleMessage = (message) => {
      if (message.projectId === project.id) {
        setMessages((current) => [...current, message]);
      }
    };

    socket.on("project:message", handleMessage);

    return () => {
      mounted = false;
      socket.off("project:message", handleMessage);
    };
  }, [project?.id, project?.isMember, socket]);

  function sendMessage() {
    if (!text.trim()) return;
    socket.emit("project:message", { projectId: project.id, senderId: user.id, senderName: user.name, text });
    setText("");
  }

  if (!project.isMember) return null;

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex items-center gap-2"><MessageSquare size={18} className="text-indigo-600" /><h3 className="font-semibold text-sm uppercase tracking-wider">Collaboration Channel</h3></div>
      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
        {messages.length === 0 && <p className="text-slate-500 italic">No messages yet. Kickstart the collaboration!</p>}
        {messages.map((message, index) => (
          <motion.p 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            key={`${message.createdAt}-${index}`} 
            className="rounded-2xl bg-white p-3 dark:bg-white/10 border border-slate-100 dark:border-white/5"
          >
            <b className="text-indigo-600 dark:text-indigo-400">{message.senderName}:</b> {message.text}
          </motion.p>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input className="input !rounded-2xl bg-white dark:bg-slate-900" placeholder="Message the team..." value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} />
        <button type="button" className="btn-primary !rounded-2xl" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 15 } }
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { type: "Collaboration" } });

  async function load() {
    setLoading(true);
    try {
      const [projectResponse, recommendationResponse] = await Promise.all([api.get("/projects"), api.get("/users/recommendations")]);
      setProjects(projectResponse.data.projects);
      setPartners(recommendationResponse.data.users.slice(0, 3));
    } catch (err) {
      toast.error("Failed to load collaborations");
    } finally {
      setLoading(false);
    }
  }

  async function create(values) {
    await api.post("/projects/create", values);
    toast.success(values.type === "Hackathon" ? "Hackathon team created" : "Collaboration initiated");
    reset({ type: "Collaboration" });
    load();
  }

  async function requestJoin(project) {
    await api.post("/projects/request-join", { projectId: project.id });
    toast.success("Join request sent to owner");
    load();
  }

  async function cancelJoinRequest(project) {
    await api.post("/projects/cancel-request", { projectId: project.id });
    toast.success("Join request cancelled");
    load();
  }

  async function deleteProject(project) {
    await api.delete(`/projects/${project.id}`);
    toast.success("Collaboration deleted");
    load();
  }

  async function reviewRequest(project, student, accepted) {
    await api.post(accepted ? "/projects/accept" : "/projects/reject", { projectId: project.id, studentId: student.id });
    toast.success(accepted ? `${student.name} added to team` : `${student.name} request rejected`);
    load();
  }

  function openCall(project, type) {
    if ((project.members || []).length < 2) {
      toast.error("You cannot start a sync room alone. Please wait for at least one teammate to join.");
      return;
    }
    window.open(`/project-call/${project.callRoomId}?type=${type}&project=${encodeURIComponent(project.title)}`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <span className="tag !bg-indigo-500 !text-white border-transparent">Venture Hub</span>
          <h1 className="mt-3 font-display text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Collaborations</h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-2xl font-medium italic">
            "Teamwork makes the dream work." Initiate new ventures, join elite teams, and build the future of VIT-AP together.
          </p>
        </div>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="card mt-10 grid gap-4 md:grid-cols-4 border-indigo-100 dark:border-indigo-500/10 bg-indigo-50/20 dark:bg-indigo-500/5 transition-all"        onSubmit={handleSubmit(create)}
      >
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1 mb-1 block">Type</label>
          <select className="input" {...register("type")}>
            <option>Collaboration</option>
            <option>Hackathon</option>
            <option>Capstone Venture</option>
            <option>Open Source</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1 mb-1 block">Venture Title</label>
          <input className="input" placeholder="e.g. AI Roadmap Gen" {...register("title", { required: true })} />
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1 mb-1 block">Skills Wanted</label>
          <input className="input" placeholder="React, Python..." {...register("skills")} />
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1 mb-1 block">Deadline</label>
          <input className="input" type="date" {...register("deadline")} />
        </div>
        <input className="input md:col-span-2" placeholder="Event name (if any)" {...register("hackathonName")} />
        <input className="input md:col-span-2" placeholder="Describe the mission..." {...register("description")} />
        <button className="btn-primary md:col-span-4 !py-4 text-base font-black transform active:scale-95 transition-all">
          <Zap size={18} className="mr-2 inline" /> Initiate New Collaboration
        </button>
      </motion.form>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.4fr]">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6"
        >
          {projects.length === 0 && !loading && (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
              <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium italic">No active collaborations yet. Be the first to start one!</p>
            </div>
          )}
          {projects.map((project) => (
            <motion.article 
              variants={itemVariants} 
              key={project.id} 
              className="card group hover:border-indigo-500/30 transition-all border-slate-100 dark:border-white/5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="tag !bg-slate-100 dark:!bg-white/5 text-slate-700 dark:text-slate-300">{project.type || "Collaboration"}</span>
                  <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">{project.title}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-400">
                    Lead: <span className="text-slate-700 dark:text-slate-200">{project.ownerName || "Unknown"}</span>
                    {project.deadline && !isNaN(new Date(project.deadline).getTime()) ? ` • Due: ${new Date(project.deadline).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {project.isOwner && <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-colors" onClick={() => deleteProject(project)}><Trash2 className="mr-2 inline" size={16} /> Disband</button>}
              </div>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">{project.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">{(project.skills || []).map((skill) => <span className="px-3 py-1 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-full text-xs font-bold text-slate-500" key={skill}>{skill}</span>)}</div>
              
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><Users size={16} /> {(project.members || []).length} members joined</p>
                </div>
                {project.isMember ? (
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary !py-2 !px-4 text-xs font-bold" onClick={() => openCall(project, "video")}><Video className="mr-2 inline" size={16} /> Video Sync</button>
                    <button className="btn-secondary !py-2 !px-4 text-xs font-bold" onClick={() => openCall(project, "voice")}><Mic className="mr-2 inline" size={16} /> Voice Call</button>
                  </div>
                ) : project.hasRequested ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full">Request Sent</span>
                    <button className="text-xs font-bold text-slate-400 hover:text-rose-500 underline" onClick={() => cancelJoinRequest(project)}>Withdraw</button>
                  </div>
                ) : (
                  <button className="btn-primary !py-2 !px-6 text-sm" onClick={() => requestJoin(project)}>Request to join venture</button>
                )}
              </div>
              
              {project.isOwner && project.joinRequests?.length > 0 && (
                <div className="mt-6 rounded-3xl bg-indigo-50/50 p-6 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20">
                  <h3 className="font-display font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <Sparkles size={16} /> {project.joinRequests.length} Pending Requests
                  </h3>
                  <div className="mt-4 space-y-3">
                    {project.joinRequests.map((student) => (
                      <div key={student.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 dark:bg-white/5 border border-indigo-100 dark:border-indigo-500/10">
                        <span className="font-bold text-sm">{student.name}</span>
                        <div className="flex gap-2">
                          <button className="btn-primary !px-4 !py-2 text-xs" onClick={() => reviewRequest(project, student, true)}><Check size={14} className="mr-1 inline"/> Accept</button>
                          <button className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-500 transition-colors" onClick={() => reviewRequest(project, student, false)}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <CollaborationChat project={project} user={user} />
            </motion.article>
          ))}
        </motion.div>

        <aside className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card h-fit border-orange-500/20 bg-orange-500/5 overflow-hidden relative"
          >
            <div className="flex items-center gap-3 relative z-10"><Rocket className="text-orange-500" /><h2 className="font-display text-2xl font-black italic tracking-tighter">Hackathon Elite</h2></div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 relative z-10 leading-relaxed">
              Create a Hackathon team, scout elite talent, and win big. This room synchronizes your team efforts in real-time.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="card h-fit"
          >
            <div className="flex items-center gap-3 mb-6"><Lightbulb className="text-amber-500" /><h2 className="font-display text-xl font-bold">Venture Matches</h2></div>
            <div className="space-y-4">
              {partners.map((person) => (
                <div key={person.id} className="group p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-amber-500/20 transition-all cursor-pointer">
                  <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-500 transition-colors">{person.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{person.reason || "Graph Recommendation"}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </aside>
      </div>
    </section>
  );
}
