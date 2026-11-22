import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CalendarDays, Check, ChevronDown, FolderKanban, Mic, Plus, Send, Trash2, Users, Video, X } from "lucide-react";
import { Avatar, Badge, EmptyState, Field, PageHeader, Skeleton, TagInput } from "../components/ui";
import { PROJECT_TYPES, SKILLS } from "../lib/constants";
import { apiErrorMessage, clockTime, shortDate } from "../lib/format";
import { api } from "../services/api";
import { getSocket } from "../services/socket";

function TeamChannel({ project }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const socket = useMemo(() => getSocket(), []);
  const endRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api.get(`/projects/${project.id}/messages`)
      .then(({ data }) => mounted && setMessages(data.messages || []))
      .catch(() => mounted && setMessages([]));

    if (!socket.connected) socket.connect();
    socket.emit("project:join", { projectId: project.id });
    const onMessage = (m) => m.projectId === project.id && setMessages((list) => [...(list || []), m]);
    socket.on("project:message", onMessage);
    return () => {
      mounted = false;
      socket.off("project:message", onMessage);
    };
  }, [project.id, socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit("project:message", { projectId: project.id, text });
    setText("");
  }

  return (
    <div className="border-t border-line bg-sunken/60">
      <div className="scrollbar-thin max-h-64 space-y-3 overflow-y-auto px-5 py-4">
        {!messages ? (
          <p className="text-sm text-ink-3">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-ink-3">No messages yet — say hi to the team.</p>
        ) : (
          messages.map((m, i) => (
            <div key={m._id || m.id || i} className="text-sm">
              <span className="font-semibold">{m.senderName}</span>
              <span className="ml-2 font-mono text-[11px] text-ink-3">{clockTime(m.createdAt)}</span>
              <p className="text-ink-2">{m.text}</p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line px-4 py-3">
        <input className="input !py-2" placeholder="Message the team…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary" disabled={!text.trim()} aria-label="Send"><Send size={15} /></button>
      </form>
    </div>
  );
}

function NewProjectForm({ onCreated, onCancel }) {
  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { type: "Project", skills: [] }
  });
  const type = watch("type");

  async function create(values) {
    try {
      await api.post("/projects/create", values);
      toast.success(values.type === "Hackathon" ? "Hackathon team created" : "Project created");
      reset();
      onCreated();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not create project"));
    }
  }

  return (
    <form onSubmit={handleSubmit(create)} className="panel-pad animate-fade-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New project</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Title" htmlFor="p-title" error={errors.title && "Give it a name"}>
          <input id="p-title" className="input" placeholder="e.g. Campus Events Hub" {...register("title", { required: true })} />
        </Field>
        <Field label="Type" htmlFor="p-type">
          <select id="p-type" className="input" {...register("type")}>{PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>
      <Field label="What are you building?" htmlFor="p-desc">
        <textarea id="p-desc" className="input" rows={3} placeholder="One or two sentences about the idea and what help you need." {...register("description")} />
      </Field>
      <Field label="Skills you need" htmlFor="p-skills">
        <Controller name="skills" control={control} render={({ field }) => <TagInput id="p-skills" value={field.value} onChange={field.onChange} suggestions={SKILLS} />} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {type === "Hackathon" && (
          <Field label="Hackathon" htmlFor="p-hack">
            <input id="p-hack" className="input" placeholder="e.g. VITAP HackFest" {...register("hackathonName")} />
          </Field>
        )}
        <Field label="Deadline" hint="optional" htmlFor="p-deadline">
          <input id="p-deadline" className="input" type="date" {...register("deadline")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create project"}</button>
      </div>
    </form>
  );
}

function ProjectCard({ project, onChange }) {
  const [channelOpen, setChannelOpen] = useState(false);
  const members = project.members || [];

  async function act(fn, success) {
    try {
      await fn();
      if (success) toast.success(success);
      onChange();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function openCall(type) {
    if (members.length < 2) return toast.error("Calls need at least one teammate in the project.");
    window.open(`/project-call/${project.callRoomId}?type=${type}&project=${encodeURIComponent(project.title)}`, "_blank", "noopener,noreferrer");
  }

  const remove = () => {
    if (!window.confirm(`Delete "${project.title}"? This also deletes its chat history.`)) return;
    act(() => api.delete(`/projects/${project.id}`), "Project deleted");
  };

  return (
    <article className="panel overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={project.type === "Hackathon" ? "accent" : "neutral"}>{project.type || "Project"}</Badge>
          {project.hackathonName && <span className="text-xs text-ink-2">{project.hackathonName}</span>}
          {project.isOwner && <Badge tone="ok">You own this</Badge>}
          {!project.isOwner && project.isMember && <Badge tone="ok">Member</Badge>}
          {project.deadline && shortDate(project.deadline) && (
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-ink-3"><CalendarDays size={12} /> {shortDate(project.deadline)}</span>
          )}
        </div>
        <h3 className="mt-3 text-xl font-semibold">{project.title}</h3>
        <p className="mt-0.5 text-sm text-ink-3">Led by {project.ownerName || "unknown"}</p>
        {project.description && <p className="mt-3 max-w-2xl text-ink-2">{project.description}</p>}

        {project.skills?.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">Needs</span>
            {project.skills.map((s) => <span key={s} className="tag">{s}</span>)}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.slice(0, 5).map((m) => <Avatar key={m.id} name={m.name} size="sm" className="rounded-md ring-2 ring-surface" />)}
            </div>
            <span className="text-sm text-ink-2"><Users size={13} className="mr-1 inline" />{members.length} member{members.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.isMember ? (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChannelOpen((v) => !v)}>
                  Team channel <ChevronDown size={14} className={`transition-transform ${channelOpen ? "rotate-180" : ""}`} />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCall("voice")} aria-label="Voice call"><Mic size={14} /></button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCall("video")} aria-label="Video call"><Video size={14} /></button>
                {project.isOwner && <button type="button" className="btn btn-ghost btn-sm text-bad hover:bg-bad-soft hover:text-bad" onClick={remove} aria-label="Delete project"><Trash2 size={14} /></button>}
              </>
            ) : project.hasRequested ? (
              <>
                <Badge tone="warn">Request pending</Badge>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.post("/projects/cancel-request", { projectId: project.id }), "Request withdrawn")}>Withdraw</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.post("/projects/request-join", { projectId: project.id }), "Request sent to the owner")}>
                <Plus size={14} /> Ask to join
              </button>
            )}
          </div>
        </div>

        {project.isOwner && project.joinRequests?.length > 0 && (
          <div className="mt-4 rounded-md border border-warn/40 bg-warn-soft/50">
            <p className="eyebrow border-b border-warn/30 px-4 py-2 text-warn">{project.joinRequests.length} asking to join</p>
            {project.joinRequests.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-ink-2">{s.department}{s.year ? ` · Year ${s.year}` : ""}</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.post("/projects/reject", { projectId: project.id, studentId: s.id }), `Declined ${s.name}`)}>Decline</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.post("/projects/accept", { projectId: project.id, studentId: s.id }), `${s.name} joined the team`)}><Check size={14} /> Accept</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {channelOpen && project.isMember && <TeamChannel project={project} />}
    </article>
  );
}

const TABS = [
  ["all", "All"],
  ["mine", "My projects"],
  ["open", "Open to join"]
];

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [tab, setTab] = useState("all");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/projects");
      setProjects(data.projects);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load projects"));
      setProjects([]);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = (projects || []).filter((p) => (tab === "mine" ? p.isMember : tab === "open" ? !p.isMember : true));
  const counts = { all: projects?.length, mine: projects?.filter((p) => p.isMember).length, open: projects?.filter((p) => !p.isMember).length };

  return (
    <div className="space-y-6">
      <PageHeader
        index="04"
        eyebrow="Collaborations"
        title="Projects & hackathon teams"
        description="Start something and list the skills you need, or ask to join a team that needs yours."
        actions={!creating && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New project</button>}
      />

      {creating && <NewProjectForm onCreated={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}

      <div className="flex gap-1 border-b border-line">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
          >
            {label} {counts[key] !== undefined && <span className="ml-1 font-mono text-[11px] text-ink-3">{counts[key]}</span>}
          </button>
        ))}
      </div>

      {!projects ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={tab === "mine" ? "You're not in any projects yet" : "Nothing here yet"}
          action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={14} /> Start a project</button>}
        >
          Projects you create or join will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-3">{visible.map((p) => <ProjectCard key={p.id} project={p} onChange={load} />)}</div>
      )}
    </div>
  );
}
