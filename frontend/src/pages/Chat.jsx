import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, FolderKanban, Hash, MessageSquare, MoreVertical, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Plus, Send, ShieldAlert, Smile, Trash2, Users, Video, X } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Count, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, clockTime, dayLabel, formatDuration, timeAgo } from "../lib/format";
import { api } from "../services/api";
import { getSocket } from "../services/socket";

const EMOJI = ["😀", "😂", "😍", "🔥", "👍", "👏", "🎉", "🚀", "🤝", "💡", "😎", "🙌"];
const TABS = [
  ["direct", "Chats", MessageSquare],
  ["group", "Groups", Users],
  ["project", "Teams", FolderKanban],
  ["calls", "Calls", Phone]
];

const conversationId = (a, b) => [a, b].sort().join(":");
const msgKey = (m) => m._id || m.id;

function appendUnique(list, message) {
  const id = msgKey(message);
  return id && list.some((m) => msgKey(m) === id) ? list : [...list, message];
}

function ReadStatus({ message, otherUserId }) {
  if ((message.readBy || []).includes(otherUserId)) return <CheckCheck size={13} className="text-accent" aria-label="Read" />;
  if ((message.deliveredTo || []).includes(otherUserId)) return <CheckCheck size={13} aria-label="Delivered" />;
  return <Check size={13} aria-label="Sent" />;
}

function ListItem({ active, onClick, avatar, title, subtitle, meta, unread }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${active ? "border-accent bg-sunken" : "border-transparent hover:bg-sunken/60"}`}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>{title}</p>
          {meta && <span className="shrink-0 font-mono text-[10px] text-ink-3">{meta}</span>}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${unread ? "text-ink" : "text-ink-3"}`}>{subtitle}</p>
          <Count value={unread} />
        </div>
      </div>
    </button>
  );
}

function RoomIcon({ type }) {
  const Icon = type === "group" ? Hash : FolderKanban;
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-sunken text-ink-2">
      <Icon size={17} />
    </span>
  );
}

function NewGroupDialog({ friends, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the group a name");
    setSaving(true);
    try {
      const { data } = await api.post("/groups/create", { name, memberIds: members });
      toast.success(`"${name}" created`);
      onCreated(data.group);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not create the group"));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-up rounded-t-xl border border-line bg-surface shadow-pop sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">New group</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="g-name" className="label">Group name</label>
            <input id="g-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DBMS study circle" />
          </div>
          <div>
            <p className="label">Add connections <span className="font-normal text-ink-3">{members.length} selected</span></p>
            {friends.length === 0 ? (
              <p className="text-sm text-ink-3">Connect with people first to add them to groups.</p>
            ) : (
              <div className="scrollbar-thin max-h-60 divide-y divide-line overflow-y-auto rounded-md border border-line">
                {friends.map((f) => {
                  const checked = members.includes(f.id);
                  return (
                    <label key={f.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-sunken">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[rgb(var(--accent))]"
                        checked={checked}
                        onChange={() => setMembers((m) => (checked ? m.filter((id) => id !== f.id) : [...m, f.id]))}
                      />
                      <Avatar name={f.name} src={f.avatarUrl} size="sm" />
                      <span className="text-sm font-medium">{f.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create group"}</button>
        </div>
      </form>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const socket = useMemo(() => getSocket(), []);
  const [mode, setMode] = useState("direct");
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingLabel, setTypingLabel] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showList, setShowList] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);

  const activeChatRef = useRef(activeChat);
  const userRef = useRef(user);
  const conversationsRef = useRef(conversations);
  const prevOnline = useRef([]);
  const typingTimeout = useRef(null);
  const listRef = useRef(null);
  const endRef = useRef(null);
  const stickToBottom = useRef(true);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const activeItem =
    activeChat?.type === "project" ? rooms.find((r) => r.id === activeChat.id)
    : activeChat?.type === "group" ? groups.find((g) => g.id === activeChat.id)
    : conversations.find((c) => c.id === activeChat?.id);

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadSidebar(select) {
    const [conv, proj, calls, grp] = await Promise.all([
      api.get("/chat/conversations"),
      api.get("/projects"),
      api.get("/calls/history"),
      api.get("/groups").catch(() => ({ data: { groups: [] } }))
    ]);
    const nextConversations = conv.data.conversations || [];
    const nextRooms = (proj.data.projects || []).filter((p) => p.isMember).map((p) => ({ ...p, unreadCount: 0 }));
    const nextGroups = grp.data.groups || [];
    setConversations(nextConversations);
    setRooms(nextRooms);
    setGroups(nextGroups);
    setCallHistory(calls.data.calls || []);
    // Seed presence from the API; live "presence:update" events keep it current.
    const initiallyOnline = nextConversations.filter((c) => c.isOnline).map((c) => c.id);
    setOnlineUserIds((ids) => [...new Set([...ids, ...initiallyOnline])]);
    if (!prevOnline.current.length) prevOnline.current = initiallyOnline;
    setLoaded(true);

    setActiveChat((current) => {
      if (select) return select;
      const exists = current && (
        (current.type === "direct" && nextConversations.some((c) => c.id === current.id)) ||
        (current.type === "project" && nextRooms.some((r) => r.id === current.id)) ||
        (current.type === "group" && nextGroups.some((g) => g.id === current.id))
      );
      if (exists) return current;
      if (nextConversations[0]) return { type: "direct", id: nextConversations[0].id };
      if (nextGroups[0]) return { type: "group", id: nextGroups[0].id };
      if (nextRooms[0]) return { type: "project", id: nextRooms[0].id };
      return null;
    });
  }

  async function loadMessages(chat) {
    if (!chat) return setMessages([]);
    stickToBottom.current = true;
    try {
      if (chat.type === "direct") {
        const { data } = await api.get(`/chat/messages/${chat.id}`);
        setMessages(data.messages || []);
        socket.emit("direct:join", { otherUserId: chat.id });
        socket.emit("direct:read", { otherUserId: chat.id });
        api.post(`/chat/read/${chat.id}`).catch(() => {});
        setConversations((list) => list.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
      } else if (chat.type === "group") {
        const { data } = await api.get(`/groups/${chat.id}/messages`);
        socket.emit("group:join", { groupId: chat.id });
        setMessages(data.messages || []);
        setGroups((list) => list.map((g) => (g.id === chat.id ? { ...g, unreadCount: 0 } : g)));
      } else {
        const { data } = await api.get(`/projects/${chat.id}/messages`);
        socket.emit("project:join", { projectId: chat.id });
        setMessages(data.messages || []);
        setRooms((list) => list.map((r) => (r.id === chat.id ? { ...r, unreadCount: 0 } : r)));
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load messages"));
      setMessages([]);
    }
  }

  useEffect(() => {
    loadSidebar().catch((error) => {
      toast.error(apiErrorMessage(error, "Could not load chats"));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    setTypingLabel("");
    setShowEmoji(false);
    setMenuOpen(false);
    loadMessages(activeChat);
  }, [activeChat?.type, activeChat?.id]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { userName: user.name });

    const isActive = (type, id) => activeChatRef.current?.type === type && activeChatRef.current.id === id;

    const onPresence = ({ userIds = [] }) => {
      userIds
        .filter((id) => !prevOnline.current.includes(id) && id !== user.id)
        .forEach((id) => {
          const friend = conversationsRef.current.find((c) => c.id === id);
          if (friend && prevOnline.current.length) toast(`${friend.name} is online`, { icon: "●", duration: 2500 });
        });
      prevOnline.current = userIds;
      setOnlineUserIds(userIds);
    };

    const onDirect = (message) => {
      const me = userRef.current;
      const otherId = message.senderId === me.id ? message.recipientId : message.senderId;
      const active = isActive("direct", otherId);
      setConversations((list) =>
        list
          .map((c) => (c.id !== otherId ? c : {
            ...c,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: active || message.senderId === me.id ? 0 : (c.unreadCount || 0) + 1
          }))
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      );
      if (active) {
        setMessages((list) => appendUnique(list, message));
        if (message.senderId !== me.id) {
          setTypingLabel("");
          api.post(`/chat/read/${otherId}`).catch(() => {});
          socket.emit("direct:read", { otherUserId: otherId });
        }
      }
    };

    const patchMine = (patch) => setMessages((list) => list.map((m) => (m.senderId === userRef.current.id ? patch(m) : m)));
    const onDelivered = ({ conversationId: id, recipientId }) => {
      const chat = activeChatRef.current;
      if (chat?.type === "direct" && conversationId(userRef.current.id, chat.id) === id) {
        patchMine((m) => ({ ...m, deliveredTo: [...new Set([...(m.deliveredTo || []), recipientId])] }));
      }
    };
    const onRead = ({ conversationId: id, readerId }) => {
      const chat = activeChatRef.current;
      if (chat?.type === "direct" && conversationId(userRef.current.id, chat.id) === id) {
        patchMine((m) => ({ ...m, deliveredTo: [...new Set([...(m.deliveredTo || []), readerId])], readBy: [...new Set([...(m.readBy || []), readerId])] }));
      }
    };

    const roomHandler = (type, key, setList) => (message) => {
      if (isActive(type, message[key])) {
        setMessages((list) => appendUnique(list, message));
        if (message.senderId !== userRef.current.id) setTypingLabel("");
      } else if (message.senderId !== userRef.current.id) {
        setList((list) => list.map((item) => (item.id === message[key] ? { ...item, unreadCount: (item.unreadCount || 0) + 1 } : item)));
      }
    };
    const onProject = roomHandler("project", "projectId", setRooms);
    const onGroup = roomHandler("group", "groupId", setGroups);

    const typingHandler = (type, key) => (payload) => {
      if (isActive(type, payload[key]) && payload.fromUserId !== userRef.current.id) {
        setTypingLabel(payload.isTyping ? payload.userName : "");
      }
    };
    const onDirectTyping = typingHandler("direct", "fromUserId");
    const onProjectTyping = typingHandler("project", "projectId");
    const onGroupTyping = typingHandler("group", "groupId");

    const refreshCalls = () => api.get("/calls/history").then(({ data }) => setCallHistory(data.calls || [])).catch(() => {});
    const onDeleted = ({ messageId }) => setMessages((list) => list.filter((m) => msgKey(m) !== messageId));
    const onReconnect = () => {
      const chat = activeChatRef.current;
      if (!chat) return;
      if (chat.type === "direct") socket.emit("direct:join", { otherUserId: chat.id });
      else if (chat.type === "group") socket.emit("group:join", { groupId: chat.id });
      else socket.emit("project:join", { projectId: chat.id });
    };

    const handlers = {
      "presence:update": onPresence,
      "direct:message": onDirect,
      "direct:delivered": onDelivered,
      "direct:read": onRead,
      "project:message": onProject,
      "group:message": onGroup,
      "direct:typing": onDirectTyping,
      "project:typing": onProjectTyping,
      "group:typing": onGroupTyping,
      "chat:message_deleted": onDeleted,
      "call:invite-response": refreshCalls,
      "call:missed": refreshCalls,
      "call:invite": refreshCalls,
      connect: onReconnect
    };
    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
    return () => Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
  }, [socket, user.id, user.name]);

  // ── Scrolling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stickToBottom.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, typingLabel]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
  }

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ── Sending ────────────────────────────────────────────────────────────────
  function emitTyping(isTyping) {
    const chat = activeChatRef.current;
    if (!chat) return;
    if (chat.type === "direct") socket.emit("direct:typing", { recipientId: chat.id, isTyping });
    else if (chat.type === "group") socket.emit("group:typing", { groupId: chat.id, isTyping });
    else socket.emit("project:typing", { projectId: chat.id, isTyping });
  }

  function onType(value) {
    setText(value);
    emitTyping(value.trim().length > 0);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1200);
  }

  function send(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!activeChat || !value) return;
    if (activeChat.type === "direct") socket.emit("direct:message", { recipientId: activeChat.id, text: value });
    else if (activeChat.type === "group") socket.emit("group:message", { groupId: activeChat.id, text: value });
    else socket.emit("project:message", { projectId: activeChat.id, text: value });
    stickToBottom.current = true;
    setText("");
    setShowEmoji(false);
    clearTimeout(typingTimeout.current);
    emitTyping(false);
    inputRef.current?.focus();
  }

  async function deleteMessage(id) {
    try {
      await api.delete(`/chat/messages/${id}`);
      setMessages((list) => list.filter((m) => msgKey(m) !== id));
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not delete message"));
    }
  }

  async function blockActive() {
    if (!activeItem || !window.confirm(`Block ${activeItem.name}? You won't be able to message each other.`)) return;
    try {
      await api.post("/connections/block", { friendId: activeItem.id });
      toast.success(`${activeItem.name} blocked`);
      setConversations((list) => list.filter((c) => c.id !== activeItem.id));
      setActiveChat(null);
      setShowList(true);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not block user"));
    }
  }

  function startPrivateCall(callType, target = activeItem) {
    if (!target) return;
    const roomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.dispatchEvent(new CustomEvent("vitap:start-call", {
      detail: { roomId, toUserId: target.id, toUserName: target.name, callType, title: `${user.name} and ${target.name}` }
    }));
  }

  function openRoomCall(callType) {
    if (!activeItem?.callRoomId) return;
    if ((activeItem.members || []).length < 2) return toast.error("Calls need at least one teammate in the project.");
    window.open(`/project-call/${activeItem.callRoomId}?type=${callType}&project=${encodeURIComponent(activeItem.title)}`, "_blank", "noopener,noreferrer");
  }

  function select(type, id) {
    setActiveChat({ type, id });
    setShowList(false);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const unreadBy = {
    direct: conversations.reduce((s, c) => s + (c.unreadCount || 0), 0),
    group: groups.reduce((s, g) => s + (g.unreadCount || 0), 0),
    project: rooms.reduce((s, r) => s + (r.unreadCount || 0), 0)
  };
  const isOnline = (id) => onlineUserIds.includes(id);
  const title = activeItem?.title || activeItem?.name;
  const subtitle = !activeItem ? ""
    : typingLabel ? `${activeChat.type === "direct" ? "" : `${typingLabel} is `}typing…`
    : activeChat.type === "direct" ? (isOnline(activeItem.id) ? "Online" : "Offline")
    : `${activeItem.members?.length || 0} members`;

  function renderList() {
    if (!loaded) return <p className="px-4 py-6 text-sm text-ink-3">Loading…</p>;

    if (mode === "direct") {
      if (!conversations.length) return <div className="p-4"><EmptyState icon={MessageSquare} title="No chats yet" action={<Link to="/discover" className="btn btn-secondary btn-sm">Find people</Link>}>You can message anyone you&apos;re connected with.</EmptyState></div>;
      return conversations.map((c) => (
        <ListItem
          key={c.id}
          active={activeChat?.type === "direct" && activeChat.id === c.id}
          onClick={() => select("direct", c.id)}
          avatar={<Avatar name={c.name} src={c.avatarUrl} online={isOnline(c.id)} />}
          title={c.name}
          subtitle={c.lastMessage || "Say hello"}
          meta={timeAgo(c.lastMessageAt)}
          unread={c.unreadCount}
        />
      ));
    }

    if (mode === "group") {
      return (
        <>
          <div className="border-b border-line p-3">
            <button type="button" className="btn btn-secondary btn-sm w-full" onClick={() => setGroupDialog(true)}><Plus size={14} /> New group</button>
          </div>
          {!groups.length ? (
            <p className="px-4 py-6 text-sm text-ink-3">No groups yet. Create one with a few connections.</p>
          ) : groups.map((g) => (
            <ListItem key={g.id} active={activeChat?.type === "group" && activeChat.id === g.id} onClick={() => select("group", g.id)} avatar={<RoomIcon type="group" />} title={g.name} subtitle={`${g.members?.length || 0} members`} unread={g.unreadCount} />
          ))}
        </>
      );
    }

    if (mode === "project") {
      if (!rooms.length) return <div className="p-4"><EmptyState icon={FolderKanban} title="No team rooms" action={<Link to="/collaborations" className="btn btn-secondary btn-sm">Browse projects</Link>}>Every project you join gets a chat room here.</EmptyState></div>;
      return rooms.map((r) => (
        <ListItem key={r.id} active={activeChat?.type === "project" && activeChat.id === r.id} onClick={() => select("project", r.id)} avatar={<RoomIcon type="project" />} title={r.title} subtitle={`${r.type || "Project"} · ${r.members?.length || 0} members`} unread={r.unreadCount} />
      ));
    }

    if (!callHistory.length) return <p className="px-4 py-6 text-sm text-ink-3">No calls yet. Start one from any direct chat.</p>;
    return callHistory.map((call) => {
      const missed = call.status === "missed" || call.status === "declined";
      const Icon = missed ? PhoneMissed : call.direction === "outgoing" ? PhoneOutgoing : PhoneIncoming;
      const friend = conversations.find((c) => c.id === call.counterpartId);
      return (
        <div key={call._id} className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Avatar name={call.counterpartName} src={friend?.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{call.counterpartName}</p>
            <p className={`flex items-center gap-1 text-xs ${missed ? "text-bad" : "text-ink-3"}`}>
              <Icon size={12} /> {call.callType} · {missed ? call.status : formatDuration(call.durationSeconds)} · {timeAgo(call.startedAt)}
            </p>
          </div>
          {friend && (
            <button type="button" className="icon-btn" onClick={() => startPrivateCall(call.callType, friend)} aria-label={`Call ${friend.name}`}>
              {call.callType === "video" ? <Video size={16} /> : <Phone size={16} />}
            </button>
          )}
        </div>
      );
    });
  }

  function renderMessages() {
    let lastDay = null;
    return messages.map((m, i) => {
      const mine = m.senderId === user.id;
      const prev = messages[i - 1];
      const day = dayLabel(m.createdAt);
      const showDay = day !== lastDay;
      lastDay = day;
      const grouped = !showDay && prev?.senderId === m.senderId && new Date(m.createdAt) - new Date(prev.createdAt) < 300000;
      const canDelete = msgKey(m) && activeChat.type !== "group" && (mine || user.role === "admin");

      return (
        <div key={msgKey(m) || `${m.createdAt}-${i}`}>
          {showDay && (
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="eyebrow">{day}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          <div className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
            {!mine && (activeChat.type === "direct" ? null : grouped ? <span className="w-8" /> : <Avatar name={m.senderName} size="sm" />)}
            {mine && canDelete && (
              <button type="button" onClick={() => deleteMessage(msgKey(m))} className="mb-1 text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus:opacity-100" aria-label="Delete message">
                <Trash2 size={13} />
              </button>
            )}
            <div className={`max-w-[78%] sm:max-w-md ${mine ? "items-end" : "items-start"} flex flex-col`}>
              {!mine && !grouped && activeChat.type !== "direct" && <p className="mb-1 px-1 text-xs font-semibold text-ink-2">{m.senderName}</p>}
              <div className={`whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-[15px] leading-snug ${mine ? "rounded-br-sm bg-ink text-bg" : "rounded-bl-sm border border-line bg-surface"}`}>
                {m.text}
              </div>
              {(!messages[i + 1] || messages[i + 1].senderId !== m.senderId) && (
                <p className={`mt-1 flex items-center gap-1 px-1 font-mono text-[10px] text-ink-3 ${mine ? "justify-end" : ""}`}>
                  {clockTime(m.createdAt)}
                  {mine && activeChat.type === "direct" && <ReadStatus message={m} otherUserId={activeChat.id} />}
                </p>
              )}
            </div>
            {!mine && canDelete && (
              <button type="button" onClick={() => deleteMessage(msgKey(m))} className="mb-1 text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100" aria-label="Delete message">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] overflow-hidden border-line bg-surface lg:h-dvh">
      {/* Sidebar */}
      <aside className={`w-full flex-col border-r border-line md:flex md:w-80 ${showList ? "flex" : "hidden"}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
        <div className="grid shrink-0 grid-cols-4 border-b border-line">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${mode === key ? "text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              <Icon size={16} />
              {label}
              {unreadBy[key] > 0 && <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-accent" />}
              {mode === key && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />}
            </button>
          ))}
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">{renderList()}</div>
      </aside>

      {/* Conversation */}
      <section className={`min-w-0 flex-1 flex-col bg-bg md:flex ${showList ? "hidden" : "flex"}`}>
        {activeItem ? (
          <>
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
              <button type="button" className="icon-btn md:hidden" onClick={() => setShowList(true)} aria-label="Back to list"><ArrowLeft size={18} /></button>
              {activeChat.type === "direct" ? <Avatar name={activeItem.name} src={activeItem.avatarUrl} online={isOnline(activeItem.id)} /> : <RoomIcon type={activeChat.type} />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{title}</p>
                <p className={`truncate text-xs ${typingLabel ? "text-accent" : "text-ink-3"}`}>{subtitle}</p>
              </div>
              {activeChat.type === "direct" && (
                <>
                  <button type="button" className="icon-btn" onClick={() => startPrivateCall("voice")} aria-label="Voice call"><Phone size={18} /></button>
                  <button type="button" className="icon-btn" onClick={() => startPrivateCall("video")} aria-label="Video call"><Video size={18} /></button>
                  <div className="relative" ref={menuRef}>
                    <button type="button" className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="More"><MoreVertical size={18} /></button>
                    {menuOpen && (
                      <div className="absolute right-0 z-20 mt-2 w-44 animate-fade-up overflow-hidden rounded-md border border-line bg-surface shadow-pop">
                        <button type="button" onClick={blockActive} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-bad hover:bg-bad-soft"><ShieldAlert size={15} /> Block user</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeChat.type === "project" && (
                <>
                  <button type="button" className="icon-btn" onClick={() => openRoomCall("voice")} aria-label="Team voice call"><Phone size={18} /></button>
                  <button type="button" className="icon-btn" onClick={() => openRoomCall("video")} aria-label="Team video call"><Video size={18} /></button>
                </>
              )}
            </header>

            <div ref={listRef} onScroll={onScroll} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4 sm:px-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-semibold">No messages yet</p>
                  <p className="mt-1 text-sm text-ink-3">Start the conversation with {title}.</p>
                </div>
              ) : renderMessages()}
              {typingLabel && (
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex gap-1 rounded-lg rounded-bl-sm border border-line bg-surface px-3.5 py-3" aria-label={`${typingLabel} is typing`}>
                    {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="shrink-0 border-t border-line bg-surface p-3">
              {showEmoji && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {EMOJI.map((e) => (
                    <button key={e} type="button" className="h-9 w-9 rounded-md text-lg hover:bg-sunken" onClick={() => { onType(text + e); inputRef.current?.focus(); }}>{e}</button>
                  ))}
                </div>
              )}
              <form onSubmit={send} className="flex items-center gap-2">
                <button type="button" className={`icon-btn ${showEmoji ? "bg-sunken text-ink" : ""}`} onClick={() => setShowEmoji((v) => !v)} aria-label="Emoji"><Smile size={18} /></button>
                <input
                  ref={inputRef}
                  className="input !py-2.5"
                  placeholder={`Message ${title}`}
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  aria-label="Message"
                />
                <button className="btn btn-accent !px-3.5" disabled={!text.trim()} aria-label="Send"><Send size={16} /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState icon={MessageSquare} title="Pick a conversation">Choose a chat, group or team room from the list.</EmptyState>
          </div>
        )}
      </section>

      {groupDialog && (
        <NewGroupDialog
          friends={conversations}
          onClose={() => setGroupDialog(false)}
          onCreated={(group) => {
            setGroupDialog(false);
            setMode("group");
            setShowList(false);
            loadSidebar({ type: "group", id: group.id });
          }}
        />
      )}
    </div>
  );
}
