import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellDot, Check, CheckCheck, Clock3, MessageSquare, Phone, Send, SmilePlus, Users, Video } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const emojiList = ["😀", "😂", "😍", "🔥", "👍", "👏", "🎉", "🚀", "🤝", "💡", "😎", "🙌"];

function formatTimestamp(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(seconds) {
  if (!seconds) return "0m";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function conversationId(userId, otherUserId) {
  return [userId, otherUserId].sort().join(":");
}

function updateMessageStatus(messages, matcher, update) {
  return messages.map((message) => (matcher(message) ? update(message) : message));
}

function StatusIcon({ message, otherUserId }) {
  if (!otherUserId) return null;
  const readBy = message.readBy || [];
  const deliveredTo = message.deliveredTo || [];
  if (readBy.includes(otherUserId)) {
    return <CheckCheck size={14} className="text-sky-200" />;
  }
  if (deliveredTo.includes(otherUserId)) {
    return <CheckCheck size={14} className="text-blue-100" />;
  }
  return <Check size={14} className="text-blue-100" />;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useMemo(() => getSocket(), []);
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const [mode, setMode] = useState("direct");
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingLabel, setTypingLabel] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const activeItem = activeChat?.type === "project"
    ? rooms.find((room) => room.id === activeChat.id)
    : conversations.find((conversation) => conversation.id === activeChat?.id);

  async function loadSidebar() {
    const [conversationResponse, projectResponse, callResponse] = await Promise.all([
      api.get("/chat/conversations"),
      api.get("/projects"),
      api.get("/calls/history")
    ]);

    const nextConversations = conversationResponse.data.conversations || [];
    const nextRooms = (projectResponse.data.projects || [])
      .filter((project) => project.isMember)
      .map((project) => ({ ...project, unreadCount: project.unreadCount || 0 }));

    setConversations(nextConversations);
    setRooms(nextRooms);
    setCallHistory(callResponse.data.calls || []);

    setActiveChat((current) => {
      if (current && ((current.type === "direct" && nextConversations.some((item) => item.id === current.id)) || (current.type === "project" && nextRooms.some((item) => item.id === current.id)))) {
        return current;
      }
      if (nextConversations[0]) return { type: "direct", id: nextConversations[0].id };
      if (nextRooms[0]) return { type: "project", id: nextRooms[0].id };
      return null;
    });
  }

  async function loadMessages(nextActiveChat) {
    if (!nextActiveChat) {
      setMessages([]);
      return;
    }

    if (nextActiveChat.type === "direct") {
      const { data } = await api.get(`/chat/messages/${nextActiveChat.id}`);
      setMessages(data.messages || []);
      await api.post(`/chat/read/${nextActiveChat.id}`);
      socket.emit("direct:read", { otherUserId: nextActiveChat.id });
      setConversations((current) => current.map((conversation) => conversation.id === nextActiveChat.id ? { ...conversation, unreadCount: 0 } : conversation));
      return;
    }

    const { data } = await api.get(`/projects/${nextActiveChat.id}/messages`);
    setMessages(data.messages || []);
    setRooms((current) => current.map((room) => room.id === nextActiveChat.id ? { ...room, unreadCount: 0 } : room));
  }

  useEffect(() => {
    loadSidebar();
  }, []);

  useEffect(() => {
    if (mode === "direct" && conversations.length && activeChat?.type !== "direct") {
      setActiveChat({ type: "direct", id: conversations[0].id });
    }
    if (mode === "project" && rooms.length && activeChat?.type !== "project") {
      setActiveChat({ type: "project", id: rooms[0].id });
    }
  }, [mode, conversations, rooms, activeChat]);

  useEffect(() => {
    socket.auth = { token: localStorage.getItem("vitap_connect_token") };
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { userName: user.name });

    const handlePresence = ({ userIds }) => {
      const ids = userIds || [];
      setOnlineUserIds(ids);
      setConversations((current) => current.map((conversation) => ({ ...conversation, isOnline: ids.includes(conversation.id) })));
    };

    const handleDirectMessage = (message) => {
      const otherUserId = message.senderId === user.id ? message.recipientId : message.senderId;
      const isActive = activeChat?.type === "direct" && activeChat.id === otherUserId;

      setConversations((current) => {
        const exists = current.some((conversation) => conversation.id === otherUserId);
        const updated = current.map((conversation) => {
          if (conversation.id !== otherUserId) return conversation;
          return {
            ...conversation,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: isActive || message.senderId === user.id ? 0 : (conversation.unreadCount || 0) + 1
          };
        });
        return exists ? [...updated].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)) : updated;
      });

      if (isActive) {
        setMessages((current) => [...current, message]);
        if (message.senderId !== user.id) {
          api.post(`/chat/read/${otherUserId}`).catch(() => {});
          socket.emit("direct:read", { otherUserId });
        }
      }
    };

    const handleDirectDelivered = ({ conversationId: id, recipientId }) => {
      if (activeChat?.type === "direct" && conversationId(user.id, activeChat.id) === id) {
        setMessages((current) => updateMessageStatus(current, (message) => message.senderId === user.id, (message) => ({
          ...message,
          deliveredTo: Array.from(new Set([...(message.deliveredTo || []), recipientId]))
        })));
      }
    };

    const handleDirectRead = ({ conversationId: id, readerId }) => {
      if (activeChat?.type === "direct" && conversationId(user.id, activeChat.id) === id) {
        setMessages((current) => updateMessageStatus(current, (message) => message.senderId === user.id, (message) => ({
          ...message,
          deliveredTo: Array.from(new Set([...(message.deliveredTo || []), readerId])),
          readBy: Array.from(new Set([...(message.readBy || []), readerId]))
        })));
        setConversations((current) => current.map((conversation) => conversation.id === readerId ? { ...conversation, unreadCount: 0 } : conversation));
      }
    };

    const handleProjectMessage = (message) => {
      const isActive = activeChat?.type === "project" && activeChat.id === message.projectId;
      if (isActive) {
        setMessages((current) => [...current, message]);
      } else if (message.senderId !== user.id) {
        setRooms((current) => current.map((room) => room.id === message.projectId ? { ...room, unreadCount: (room.unreadCount || 0) + 1 } : room));
      }
    };

    const handleDirectTyping = ({ fromUserId, userName, isTyping }) => {
      if (activeChat?.type === "direct" && activeChat.id === fromUserId) {
        setTypingLabel(isTyping ? `${userName} is typing...` : "");
      }
    };

    const handleProjectTyping = ({ projectId, userName, isTyping }) => {
      if (activeChat?.type === "project" && activeChat.id === projectId) {
        setTypingLabel(isTyping ? `${userName} is typing in the room...` : "");
      }
    };

    const refreshCalls = () => {
      api.get("/calls/history").then(({ data }) => setCallHistory(data.calls || [])).catch(() => {});
    };

    socket.on("presence:update", handlePresence);
    socket.on("direct:message", handleDirectMessage);
    socket.on("direct:delivered", handleDirectDelivered);
    socket.on("direct:read", handleDirectRead);
    socket.on("project:message", handleProjectMessage);
    socket.on("direct:typing", handleDirectTyping);
    socket.on("project:typing", handleProjectTyping);
    socket.on("call:invite-response", refreshCalls);
    socket.on("call:missed", refreshCalls);
    socket.on("call:invite", refreshCalls);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("direct:message", handleDirectMessage);
      socket.off("direct:delivered", handleDirectDelivered);
      socket.off("direct:read", handleDirectRead);
      socket.off("project:message", handleProjectMessage);
      socket.off("direct:typing", handleDirectTyping);
      socket.off("project:typing", handleProjectTyping);
      socket.off("call:invite-response", refreshCalls);
      socket.off("call:missed", refreshCalls);
      socket.off("call:invite", refreshCalls);
    };
  }, [activeChat, socket, user.id, user.name]);

  useEffect(() => {
    if (!activeChat) return;
    setTypingLabel("");
    setShowEmojiPicker(false);

    if (activeChat.type === "direct") {
      socket.emit("direct:join", { otherUserId: activeChat.id });
    } else {
      socket.emit("project:join", { projectId: activeChat.id });
    }

    loadMessages(activeChat);
  }, [activeChat, socket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingLabel]);

  function emitTyping(nextText) {
    const isDirect = activeChat?.type === "direct";
    const payload = isDirect ? { recipientId: activeChat?.id, isTyping: nextText.trim().length > 0 } : { projectId: activeChat?.id, isTyping: nextText.trim().length > 0 };

    if (isDirect) {
      socket.emit("direct:typing", payload);
    } else if (activeChat?.type === "project") {
      socket.emit("project:typing", payload);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      if (isDirect) {
        socket.emit("direct:typing", { recipientId: activeChat?.id, isTyping: false });
      } else if (activeChat?.type === "project") {
        socket.emit("project:typing", { projectId: activeChat?.id, isTyping: false });
      }
    }, 1200);
  }

  function handleInputChange(event) {
    const nextText = event.target.value;
    setText(nextText);
    if (activeChat) emitTyping(nextText);
  }

  function addEmoji(emoji) {
    const next = `${text}${emoji}`;
    setText(next);
    emitTyping(next);
  }

  function startPrivateCall(callType) {
    if (activeChat?.type !== "direct" || !activeItem) return;
    const roomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = `${user.name} and ${activeItem.name}`;
    window.dispatchEvent(new CustomEvent("vitap:start-call", {
      detail: {
        roomId,
        toUserId: activeItem.id,
        toUserName: activeItem.name,
        callType,
        title
      }
    }));
    toast.success(`${callType === "video" ? "Video" : "Voice"} call invitation sent to ${activeItem.name}`);
  }

  function sendMessage() {
    const value = text.trim();
    if (!activeChat || !value) return;

    if (activeChat.type === "direct") {
      socket.emit("direct:message", { recipientId: activeChat.id, text: value });
    } else {
      socket.emit("project:message", { projectId: activeChat.id, text: value });
    }

    setText("");
    setTypingLabel("");
    setShowEmojiPicker(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="tag">Encrypted realtime collaboration</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Messages</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Private chats are stored encrypted, with live presence, typing indicators, emoji replies, delivery status, and private calling.</p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-white/10">
          <button type="button" className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "direct" ? "bg-white text-slate-900 shadow" : "text-slate-500 dark:text-slate-300"}`} onClick={() => setMode("direct")}>Private</button>
          <button type="button" className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "project" ? "bg-white text-slate-900 shadow" : "text-slate-500 dark:text-slate-300"}`} onClick={() => setMode("project")}>Projects</button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.38fr_1fr]">
        <aside className="card">
          <div className="flex items-center gap-2">
            {mode === "direct" ? <BellDot className="text-blue-600" /> : <Users className="text-blue-600" />}
            <h2 className="font-display text-2xl font-bold">{mode === "direct" ? "Friend chats" : "Your rooms"}</h2>
          </div>
          <div className="mt-5 space-y-3">
            {mode === "direct" && conversations.length === 0 && <p className="text-sm text-slate-500">Accept a friend connection to unlock private chat.</p>}
            {mode === "project" && rooms.length === 0 && <p className="text-sm text-slate-500">Join a project or hackathon to unlock room chat.</p>}

            {mode === "direct" && conversations.map((conversation) => {
              const active = activeChat?.type === "direct" && activeChat.id === conversation.id;
              const unreadCount = conversation.unreadCount || 0;
              return (
                <button type="button" key={conversation.id} className={`w-full rounded-3xl px-4 py-4 text-left transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white"}`} onClick={() => setActiveChat({ type: "direct", id: conversation.id })}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{conversation.name}</p>
                        <span className={`h-2.5 w-2.5 rounded-full ${onlineUserIds.includes(conversation.id) ? "bg-emerald-400" : active ? "bg-blue-200" : "bg-slate-300"}`} />
                      </div>
                      <p className={`mt-1 text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>{conversation.lastMessage || "Start a conversation"}</p>
                    </div>
                    <div className="text-right">
                      {conversation.lastMessageAt && <p className={`text-[11px] ${active ? "text-blue-100" : "text-slate-500"}`}>{formatTimestamp(conversation.lastMessageAt)}</p>}
                      {unreadCount > 0 && <span className={`mt-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-blue-600 text-white"}`}>{unreadCount}</span>}
                    </div>
                  </div>
                </button>
              );
            })}

            {mode === "project" && rooms.map((room) => {
              const active = activeChat?.type === "project" && activeChat.id === room.id;
              return (
                <button type="button" key={room.id} className={`w-full rounded-3xl px-4 py-4 text-left transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white"}`} onClick={() => setActiveChat({ type: "project", id: room.id })}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{room.title}</p>
                      <p className={`mt-1 text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>{room.type || "Project"}</p>
                    </div>
                    {(room.unreadCount || 0) > 0 && <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-blue-600 text-white"}`}>{room.unreadCount}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {mode === "direct" && (
            <div className="mt-8 border-t border-slate-200 pt-5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-violet-600" />
                <h3 className="font-semibold">Recent calls</h3>
              </div>
              <div className="mt-4 space-y-3">
                {callHistory.slice(0, 4).map((call) => (
                  <div key={call._id || `${call.roomId}-${call.startedAt}`} className="rounded-3xl bg-slate-100 px-4 py-3 text-sm dark:bg-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{call.counterpartName}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${call.status === "missed" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200" : call.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"}`}>{call.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{call.direction} {call.callType} call · {formatTimestamp(call.startedAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">Duration: {formatDuration(call.durationSeconds || 0)}</p>
                  </div>
                ))}
                {callHistory.length === 0 && <p className="text-sm text-slate-500">No call history yet.</p>}
              </div>
            </div>
          )}
        </aside>

        <div className="card flex min-h-[38rem] flex-col">
          {activeItem ? (
            <>
              <div className="border-b border-slate-200 pb-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="text-blue-600" />
                      <h2 className="font-display text-2xl font-bold">{activeItem.title || activeItem.name}</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeChat?.type === "direct"
                        ? (onlineUserIds.includes(activeItem.id) ? "Online now" : "Offline right now")
                        : `${activeItem.type || "Project"} room chat with accepted members only.`}
                    </p>
                  </div>
                  {activeChat?.type === "direct" && (
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary !px-4 !py-3" onClick={() => startPrivateCall("voice")}><Phone size={18} /></button>
                      <button type="button" className="btn-secondary !px-4 !py-3" onClick={() => startPrivateCall("video")}><Video size={18} /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the discussion.</p>}
                {messages.map((message, index) => {
                  const mine = message.senderId === user.id;
                  return (
                    <div key={`${message.createdAt}-${index}`} className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${mine ? "ml-auto bg-blue-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-xs font-semibold ${mine ? "text-blue-100" : "text-slate-500"}`}>{mine ? "You" : message.senderName}</p>
                        <p className={`text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{formatTimestamp(message.createdAt)}</p>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                      {mine && activeChat?.type === "direct" && (
                        <div className="mt-2 flex justify-end">
                          <StatusIcon message={message} otherUserId={activeChat.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {typingLabel && <p className="text-sm text-slate-500">{typingLabel}</p>}
                <div ref={messageEndRef} />
              </div>

              {showEmojiPicker && (
                <div className="mt-4 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/60">
                  {emojiList.map((emoji) => (
                    <button type="button" key={emoji} className="rounded-2xl bg-white px-3 py-2 text-xl shadow-sm transition hover:-translate-y-0.5 dark:bg-white/10" onClick={() => addEmoji(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                <button type="button" className="btn-secondary !px-4" onClick={() => setShowEmojiPicker((current) => !current)}><SmilePlus size={18} /></button>
                <input className="input" placeholder={activeChat?.type === "direct" ? `Message ${activeItem.name}` : `Message ${activeItem.title}`} value={text} onChange={handleInputChange} onKeyDown={(event) => event.key === "Enter" && sendMessage()} />
                <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={sendMessage}><Send size={16} /> Send</button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-slate-500">
              Choose a friend or project room to start chatting.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
