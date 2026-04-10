import { memo, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Check, Lightbulb, MessageSquare, Mic, Rocket, Trash2, Users, Video, X } from "lucide-react";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const ProjectChat = memo(({ project, user }) => {
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
      <div className="flex items-center gap-2"><MessageSquare size={18} className="text-blue-600" /><h3 className="font-semibold">Project group chat</h3></div>
      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
        {messages.length === 0 && <p className="text-slate-500">No messages yet. Start the collaboration.</p>}
        {messages.map((message, index) => <p key={`${message.createdAt}-${index}`} className="rounded-2xl bg-white p-3 dark:bg-white/10"><b>{message.senderName}:</b> {message.text}</p>)}
      </div>
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Message the project group" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} />
        <button type="button" className="btn-primary" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
});

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([]);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { type: "Project" } });

  async function load() {
    const [projectResponse, recommendationResponse] = await Promise.all([api.get("/projects"), api.get("/users/recommendations")]);
    setProjects(projectResponse.data.projects);
    setPartners(recommendationResponse.data.users.slice(0, 3));
  }

  async function create(values) {
    await api.post("/projects/create", values);
    toast.success(values.type === "Hackathon" ? "Hackathon team created" : "Project created");
    reset({ type: "Project" });
    load();
  }

  async function requestJoin(project) {
    await api.post("/projects/request-join", { projectId: project.id });
    toast.success("Join request sent to project owner");
    load();
  }

  async function cancelJoinRequest(project) {
    await api.post("/projects/cancel-request", { projectId: project.id });
    toast.success("Join request cancelled");
    load();
  }

  async function deleteProject(project) {
    await api.delete(`/projects/${project.id}`);
    toast.success("Project deleted");
    load();
  }

  async function reviewRequest(project, student, accepted) {
    await api.post(accepted ? "/projects/accept" : "/projects/reject", { projectId: project.id, studentId: student.id });
    toast.success(accepted ? `${student.name} added to project` : `${student.name} request rejected`);
    load();
  }

  function openCall(project, type) {
    window.open(`/project-call/${project.callRoomId}?type=${type}&project=${encodeURIComponent(project.title)}`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="tag">Projects + Hackathons</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Collaboration Hub</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Users request to join, owners approve members, and accepted teams get a project chat plus call room.</p>
        </div>
      </div>
      <form className="card mt-8 grid gap-4 md:grid-cols-4" onSubmit={handleSubmit(create)}>
        <select className="input" {...register("type")}><option>Project</option><option>Hackathon</option></select>
        <input className="input" placeholder="Title" {...register("title", { required: true })} />
        <input className="input" placeholder="Required skills" {...register("skills")} />
        <input className="input" type="date" placeholder="Deadline" {...register("deadline")} />
        <input className="input md:col-span-2" placeholder="Hackathon name or event" {...register("hackathonName")} />
        <input className="input md:col-span-2" placeholder="Description" {...register("description")} />
        <button className="btn-primary md:col-span-4">Create collaboration room</button>
      </form>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.45fr]">
        <div className="grid gap-5">
          {projects.map((project) => (
            <article key={project.id} className="card">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="tag">{project.type || "Project"}</span>
                  <h2 className="mt-3 font-display text-2xl font-bold">{project.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Owner: {project.ownerName || "Unknown"}
                    {project.deadline && !isNaN(new Date(project.deadline).getTime()) ? ` - Deadline: ${new Date(project.deadline).toLocaleDateString()}` : project.deadline ? ` - Deadline: ${project.deadline}` : ""}
                  </p>
                </div>
                {project.isOwner && <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors" onClick={() => deleteProject(project)}><Trash2 className="mr-2 inline" size={16} /> Delete</button>}
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">{(project.skills || []).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><Users size={16} /> {(project.members || []).length} members</p>
              {project.isMember ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="relative group">
                    <button 
                      className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed group" 
                      onClick={() => openCall(project, "video")}
                      disabled={(project.members || []).length < 2}
                    >
                      <Video className="mr-2 inline" size={18} /> Video room
                    </button>
                    {(project.members || []).length < 2 && (
                      <span className="absolute -top-10 left-0 hidden group-hover:block w-48 rounded-lg bg-slate-900 px-3 py-2 text-[11px] text-white shadow-xl">
                        Requires at least 2 members to start a call.
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <button 
                      className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed" 
                      onClick={() => openCall(project, "voice")}
                      disabled={(project.members || []).length < 2}
                    >
                      <Mic className="mr-2 inline" size={18} /> Voice room
                    </button>
                    {(project.members || []).length < 2 && (
                      <span className="absolute -top-10 left-0 hidden group-hover:block w-48 rounded-lg bg-slate-900 px-3 py-2 text-[11px] text-white shadow-xl">
                        Requires at least 2 members to start a call.
                      </span>
                    )}
                  </div>
                </div>
              ) : project.hasRequested ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Request pending approval</p>
                  <button className="btn-secondary" onClick={() => cancelJoinRequest(project)}>Cancel request</button>
                </div>
              ) : (
                <button className="btn-secondary mt-5 w-full" onClick={() => requestJoin(project)}>Request to join</button>
              )}
              {project.isOwner && project.joinRequests?.length > 0 && <div className="mt-5 rounded-3xl bg-blue-50 p-4 dark:bg-blue-500/10"><h3 className="font-semibold">Join requests</h3><div className="mt-3 space-y-3">{project.joinRequests.map((student) => <div key={student.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 dark:bg-white/10"><span>{student.name}</span><div className="flex gap-2"><button className="btn-secondary !px-3 !py-2" onClick={() => reviewRequest(project, student, true)}><Check size={16} /></button><button className="rounded-full bg-rose-100 px-3 py-2 text-rose-700" onClick={() => reviewRequest(project, student, false)}><X size={16} /></button></div></div>)}</div></div>}
              <ProjectChat project={project} user={user} />
            </article>
          ))}
        </div>
        <aside className="card h-fit">
          <div className="flex items-center gap-3"><Rocket className="text-orange-500" /><h2 className="font-display text-2xl font-bold">Hackathon mode</h2></div>
          <p className="mt-3 text-sm text-slate-500">Create a Hackathon room, collect join requests, approve a team, and use chat/calls to coordinate.</p>
          <div className="mt-6 flex items-center gap-3"><Lightbulb className="text-amber-500" /><h2 className="font-display text-xl font-bold">Partner ideas</h2></div>
          <div className="mt-4 space-y-4">{partners.map((person) => <div key={person.id} className="rounded-3xl bg-slate-100 p-4 dark:bg-white/10"><p className="font-semibold">{person.name}</p><p className="text-xs text-slate-500">{person.reason || "Graph-based project match"}</p></div>)}</div>
        </aside>
      </div>
    </section>
  );
}
