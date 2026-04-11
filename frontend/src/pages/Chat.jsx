import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCheck, MessageSquare, Phone, Send, SmilePlus, Users, Video, MoreVertical, Menu, ArrowLeft, Trash2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const emojiList = ["😀", "😂", "😍", "🔥", "👍", "👏", "🎉", "🚀", "🤝", "💡", "😎", "🙌"];

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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
    return <CheckCheck size={14} className="text-blue-400" />;
  }
  if (deliveredTo.includes(otherUserId)) {
    return <CheckCheck size={14} className="text-slate-400" />;
  }
  return <Check size={14} className="text-slate-400" />;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useMemo(() => getSocket(), []);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageEndRef = useRef(null);
  // Track if we should auto-scroll. Only true after a new message arrives, not on initial load.
  const isInitialLoad = useRef(true);
  const prevMessageCount = useRef(0);
  const [mode, setMode] = useState("direct");
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingLabel, setTypingLabel] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const headerMenuRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const userRef = useRef(user); // Added userRef to prevent stale closures

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { userRef.current = user; }, [user]);

  const prevOnlineUserIds = useRef([]);

  const activeItem = activeChatRef.current?.type === "project"
    ? rooms.find((room) => room.id === activeChat.id)
    : activeChat?.type === "group"
    ? groups.find((g) => g.id === activeChat.id)
    : conversations.find((conversation) => conversation.id === activeChat?.id);

  async function loadSidebar() {
    const [conversationResponse, projectResponse, callResponse, groupResponse] = await Promise.all([
      api.get("/chat/conversations"),
      api.get("/projects"),
      api.get("/calls/history"),
      api.get("/groups").catch(() => ({ data: { groups: [] } }))
    ]);

    const nextConversations = conversationResponse.data.conversations || [];
    const nextRooms = (projectResponse.data.projects || [])
      .filter((project) => project.isMember)
      .map((project) => ({ ...project, unreadCount: project.unreadCount || 0 }));
    const nextGroups = groupResponse.data.groups || [];

    setConversations(nextConversations);
    setRooms(nextRooms);
    setGroups(nextGroups);
    setCallHistory(callResponse.data.calls || []);

    setActiveChat((current) => {
      if (current && (
        (current.type === "direct" && nextConversations.some((item) => item.id === current.id)) ||
        (current.type === "project" && nextRooms.some((item) => item.id === current.id)) ||
        (current.type === "group" && nextGroups.some((item) => item.id === current.id))
      )) return current;
      if (nextConversations[0]) return { type: "direct", id: nextConversations[0].id };
      if (nextRooms[0]) return { type: "project", id: nextRooms[0].id };
      return null;
    });
  }

  async function loadMessages(nextActiveChat) {
    if (!nextActiveChat) { setMessages([]); return; }
    isInitialLoad.current = true;
    prevMessageCount.current = 0;
    setShouldAutoScroll(false);

    if (nextActiveChat.type === "direct") {
      const { data } = await api.get(`/chat/messages/${nextActiveChat.id}`);
      setMessages(data.messages || []);
      await api.post(`/chat/read/${nextActiveChat.id}`);
      socket.emit("direct:join", { otherUserId: nextActiveChat.id }); // JOIN THE ROOM
      socket.emit("direct:read", { otherUserId: nextActiveChat.id });
      setConversations((current) => current.map((conversation) => conversation.id === nextActiveChat.id ? { ...conversation, unreadCount: 0 } : conversation));
      return;
    }

    if (nextActiveChat.type === "group") {
      const { data } = await api.get(`/groups/${nextActiveChat.id}/messages`);
      socket.emit("group:join", { groupId: nextActiveChat.id }); // JOIN THE ROOM
      setMessages(data.messages || []);
      return;
    }

    const { data } = await api.get(`/projects/${nextActiveChat.id}/messages`);
    socket.emit("project:join", { projectId: nextActiveChat.id }); // JOIN THE ROOM
    setMessages(data.messages || []);
    setRooms((current) => current.map((room) => room.id === nextActiveChat.id ? { ...room, unreadCount: 0 } : room));
    
    // Explicitly scroll to bottom after messages load
    setTimeout(() => {
      if (messageEndRef.current) messageEndRef.current.scrollIntoView({ behavior: "instant" });
    }, 100);
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
    if (mode === "group" && groups.length && activeChat?.type !== "group") {
      setActiveChat({ type: "group", id: groups[0].id });
    }
  }, [mode, conversations, rooms, groups, activeChat]);

  useEffect(() => {
    socket.auth = { token: localStorage.getItem("vitap_connect_token") };
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { userName: user.name });

    const handlePresence = ({ userIds }) => {
      const ids = userIds || [];
      const newlyOnline = ids.filter(id => !prevOnlineUserIds.current.includes(id) && id !== user.id);
      
      if (newlyOnline.length > 0) {
        newlyOnline.forEach(id => {
          const friend = conversations.find(c => c.id === id);
          if (friend) toast.success(`${friend.name} is now online`, { icon: "🟢", duration: 3000 });
        });
      }

      prevOnlineUserIds.current = ids;
      setOnlineUserIds(ids);
      setConversations((current) => current.map((conversation) => ({ ...conversation, isOnline: ids.includes(conversation.id) })));
    };

    const handleDirectMessage = (message) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      const otherUserId = message.senderId === currentUser.id ? message.recipientId : message.senderId;
      const isActive = activeChatRef.current?.type === "direct" && activeChatRef.current.id === otherUserId;

      setConversations((current) => {
        const exists = current.some((conversation) => conversation.id === otherUserId);
        const updated = current.map((conversation) => {
          if (conversation.id !== otherUserId) return conversation;
          return {
            ...conversation,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: isActive || message.senderId === currentUser.id ? 0 : (conversation.unreadCount || 0) + 1
          };
        });
        return [...updated].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });

      if (isActive) {
        setMessages((current) => {
          const msgId = message._id || message.id;
          const exists = current.some(m => (m._id || m.id) === msgId);
          if (exists) return current;
          return [...current, message];
        });
        if (message.senderId !== currentUser.id) {
          api.post(`/chat/read/${otherUserId}`).catch(() => {});
          socket.emit("direct:read", { otherUserId });
        }
      }
    };

    const handleDirectDelivered = ({ conversationId: id, recipientId }) => {
      const currentActive = activeChatRef.current;
      const currentUser = userRef.current;
      if (currentActive?.type === "direct" && conversationId(currentUser?.id, currentActive.id) === id) {
        setMessages((current) => updateMessageStatus(current, (message) => message.senderId === currentUser?.id, (message) => ({
          ...message,
          deliveredTo: Array.from(new Set([...(message.deliveredTo || []), recipientId]))
        })));
      }
    };

    const handleDirectRead = ({ conversationId: id, readerId }) => {
      const currentActive = activeChatRef.current;
      const currentUser = userRef.current;
      if (currentActive?.type === "direct" && conversationId(currentUser?.id, currentActive.id) === id) {
        setMessages((current) => updateMessageStatus(current, (message) => message.senderId === currentUser?.id, (message) => ({
          ...message,
          deliveredTo: Array.from(new Set([...(message.deliveredTo || []), readerId])),
          readBy: Array.from(new Set([...(message.readBy || []), readerId]))
        })));
        setConversations((current) => current.map((conversation) => conversation.id === readerId ? { ...conversation, unreadCount: 0 } : conversation));
      }
    };

    const handleProjectMessage = (message) => {
      const currentActive = activeChatRef.current;
      const currentUser = userRef.current;
      const isActive = currentActive?.type === "project" && currentActive.id === message.projectId;
      if (isActive) {
        setMessages((current) => {
          const msgId = message._id || message.id;
          const exists = current.some(m => (m._id || m.id) === msgId);
          if (exists) return current;
          return [...current, message];
        });
      } else if (message.senderId !== currentUser?.id) {
        setRooms((current) => current.map((room) => room.id === message.projectId ? { ...room, unreadCount: (room.unreadCount || 0) + 1 } : room));
      }
    };

    const handleDirectTyping = ({ fromUserId, userName, isTyping }) => {
      const currentActive = activeChatRef.current;
      if (currentActive?.type === "direct" && currentActive.id === fromUserId) {
        setTypingLabel(isTyping ? `${userName} is typing...` : "");
      }
    };

    const handleProjectTyping = ({ projectId, userName, isTyping }) => {
      const currentActive = activeChatRef.current;
      if (currentActive?.type === "project" && currentActive.id === projectId) {
        setTypingLabel(isTyping ? `${userName} is typing in the room...` : "");
      }
    };

    const refreshCalls = () => {
      api.get("/calls/history").then(({ data }) => setCallHistory(data.calls || [])).catch(() => {});
    };

    const handleGroupMessage = (message) => {
      const currentActive = activeChatRef.current;
      const currentUser = userRef.current;
      const isActive = currentActive?.type === "group" && currentActive.id === message.groupId;
      if (isActive) {
        setMessages((current) => {
          const msgId = message._id || message.id;
          const exists = current.some(m => (m._id || m.id) === msgId);
          if (exists) return current;
          return [...current, message];
        });
      } else if (message.senderId !== currentUser?.id) {
        setGroups((current) => current.map((g) => g.id === message.groupId ? { ...g, unreadCount: (g.unreadCount || 0) + 1 } : g));
      }
    };

    const handleGroupTyping = ({ groupId, userName, isTyping }) => {
      const currentActive = activeChatRef.current;
      if (currentActive?.type === "group" && currentActive.id === groupId) {
        setTypingLabel(isTyping ? `${userName} is typing...` : "");
      }
    };

    const onReconnect = () => {
      const currentActive = activeChatRef.current;
      if (!currentActive) return;
      if (currentActive.type === "direct") {
        socket.emit("direct:join", { otherUserId: currentActive.id });
      } else if (currentActive.type === "group") {
        socket.emit("group:join", { groupId: currentActive.id });
      } else {
        socket.emit("project:join", { projectId: currentActive.id });
      }
    };


    const handleMessageDeleted = ({ messageId }) => {
      setMessages((current) => current.filter((m) => (m._id || m.id) !== messageId));
    };

    socket.on("presence:update", handlePresence);
    socket.on("direct:message", handleDirectMessage);
    socket.on("direct:delivered", handleDirectDelivered);
    socket.on("direct:read", handleDirectRead);
    socket.on("project:message", handleProjectMessage);
    socket.on("group:message", handleGroupMessage);
    socket.on("direct:typing", handleDirectTyping);
    socket.on("project:typing", handleProjectTyping);
    socket.on("group:typing", handleGroupTyping);
    socket.on("chat:message_deleted", handleMessageDeleted);
    socket.on("call:invite-response", refreshCalls);
    socket.on("call:missed", refreshCalls);
    socket.on("call:invite", refreshCalls);
    socket.on("connect", onReconnect); // Handle re-joins on reconnect

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("direct:message", handleDirectMessage);
      socket.off("direct:delivered", handleDirectDelivered);
      socket.off("direct:read", handleDirectRead);
      socket.off("project:message", handleProjectMessage);
      socket.off("group:message", handleGroupMessage);
      socket.off("direct:typing", handleDirectTyping);
      socket.off("project:typing", handleProjectTyping);
      socket.off("group:typing", handleGroupTyping);
      socket.off("chat:message_deleted", handleMessageDeleted);
      socket.off("call:invite-response", refreshCalls);
      socket.off("call:missed", refreshCalls);
      socket.off("call:invite", refreshCalls);
      socket.off("connect", onReconnect);
    };
  }, [activeChat, socket, user.id, user.name]);

  useEffect(() => {
    if (!activeChat) return;
    setTypingLabel("");
    setShowEmojiPicker(false);

    if (activeChat.type === "direct") {
      socket.emit("direct:join", { otherUserId: activeChat.id });
    } else if (activeChat.type === "group") {
      socket.emit("group:join", { groupId: activeChat.id });
    } else {
      socket.emit("project:join", { projectId: activeChat.id });
    }

    loadMessages(activeChat);
  }, [activeChat, socket]);

  useEffect(() => {
    const count = messages.length;
    if (isInitialLoad.current) {
      // First time messages arrive after switching chat — mark done, don't scroll.
      isInitialLoad.current = false;
      prevMessageCount.current = count;
      return;
    }
    // A new message was added — scroll only if user is near the bottom.
    if (count > prevMessageCount.current && shouldAutoScroll && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = count;
  }, [messages]);

  useEffect(() => {
    // Scroll down for typing indicator when near bottom
    if (typingLabel && shouldAutoScroll && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingLabel, shouldAutoScroll]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setShouldAutoScroll(isNearBottom);
    }
  };

  // Close header dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    // New message sent — enable auto-scroll
    setShouldAutoScroll(true);
    setText("");
    setTypingLabel("");
    setShowEmojiPicker(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  async function deleteMessage(messageId) {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages((current) => current.filter((m) => (m._id || m.id) !== messageId));
      toast.success("Message deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete message");
    }
  }

  async function blockAndClose() {
    if (!activeItem) return;
    try {
      await api.post("/connections/block", { friendId: activeItem.id });
      toast.success(`${activeItem.name} has been blocked`);
      setHeaderMenuOpen(false);
      // Remove from conversations list
      setConversations((current) => current.filter((c) => c.id !== activeItem.id));
      setActiveChat(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user");
    }
  }

  return (
    <div className="flex overflow-hidden bg-slate-50 dark:bg-slate-900" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Unified Responsive Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 flex-col ${showMobileList ? "flex" : "hidden md:flex"}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            <button
              type="button"
              className={`p-2 rounded-lg transition-all ${mode === "direct" ? "bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200 dark:border-white/5" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setMode("direct")}
              title="Direct Messages"
            >
              <MessageSquare size={18} />
            </button>
            <button
              type="button"
              className={`p-2 rounded-lg transition-all ${mode === "project" ? "bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200 dark:border-white/5" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setMode("project")}
              title="Collaborations"
            >
              <Users size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {mode === "direct" && conversations.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={32} className="opacity-50" />
                  </div>
                  <p className="font-bold">No chats yet</p>
                  <p className="text-xs mt-1">Connect with students to start a conversation.</p>
                </div>
              )}
              {mode === "project" && rooms.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="opacity-50" />
                  </div>
                  <p className="font-bold">No ventures</p>
                  <p className="text-xs mt-1">Join a collaboration room to find your team.</p>
                </div>
              )}

              {mode === "direct" && conversations.map((conversation, idx) => {
                const active = activeChat?.type === "direct" && activeChat.id === conversation.id;
                const unreadCount = conversation.unreadCount || 0;
                return (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    type="button"
                    key={conversation.id}
                    className={`w-full p-4 text-left border-l-4 transition-all ${active ? "bg-indigo-50/50 border-indigo-600 dark:bg-indigo-600/10" : "border-transparent border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    onClick={() => { setActiveChat({ type: "direct", id: conversation.id }); setShowMobileList(false); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-white/10" 
                          src={conversation.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(conversation.name)}`} 
                          alt={conversation.name} 
                        />
                        {onlineUserIds.includes(conversation.id) && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-bold truncate ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                            {conversation.name}
                          </p>
                          {conversation.lastMessageAt && (
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {formatTimestamp(conversation.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-500 truncate pr-4">
                            {conversation.lastMessage || "Start a conversation"}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-indigo-600 text-white text-[10px] font-black rounded-lg px-2 py-0.5">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {mode === "project" && rooms.map((room, idx) => {
                const active = activeChat?.type === "project" && activeChat.id === room.id;
                const unreadCount = room.unreadCount || 0;
                return (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    type="button"
                    key={room.id}
                    className={`w-full p-4 text-left border-l-4 transition-all ${active ? "bg-indigo-50/50 border-indigo-600 dark:bg-indigo-600/10" : "border-transparent border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    onClick={() => { setActiveChat({ type: "project", id: room.id }); setShowMobileList(false); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10">
                        <Users size={18} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-bold truncate ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                            {room.title}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-indigo-600 text-white text-[10px] font-black rounded-lg px-2 py-0.5">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 uppercase tracking-wider font-bold">
                          {room.type || "Collaboration"} • {room.members?.length || 0} members
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Area - ensuring flex-grow and proper vertical distribution */}
      <div className={`flex-1 flex-col min-w-0 bg-white dark:bg-slate-900 ${!showMobileList ? "flex" : "hidden md:flex"}`}>
        {activeItem ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  type="button"
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => setShowMobileList(true)}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 flex-shrink-0">
                  {activeChat?.type === "direct" ? (
                    <img 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10" 
                      src={activeItem.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(activeItem.name)}`} 
                      alt={activeItem.name} 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900 dark:text-white truncate">
                    {activeItem.title || activeItem.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activeChat?.type === "direct"
                      ? (onlineUserIds.includes(activeItem.id) ? "online" : "offline")
                      : `${activeItem.members?.length || 0} members`}
                  </p>
                </div>
              </div>
              {activeChat?.type === "direct" && (
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => startPrivateCall("voice")}
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    type="button"
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => startPrivateCall("video")}
                  >
                    <Video size={20} />
                  </button>
                  {/* 3-dot header menu */}
                  <div className="relative" ref={headerMenuRef}>
                    <button
                      type="button"
                      className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                      onClick={() => setHeaderMenuOpen((v) => !v)}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {headerMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute right-0 top-10 z-50 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          onClick={blockAndClose}
                        >
                          <ShieldAlert size={16} />
                          Block User
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2"
              onScroll={handleScroll}
            >
              {messages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation</p>
                </div>
              )}
              {messages.map((message, index) => {
                const mine = message.senderId === user.id;
                const msgId = message._id || message.id;
                const prevMessage = messages[index - 1];
                const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;
                const showTimestamp = !prevMessage || new Date(message.createdAt) - new Date(prevMessage.createdAt) > 300000; // 5 minutes

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    key={`${message.createdAt}-${index}`} 
                    className={`flex gap-2 px-2 group ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine && showAvatar && (
                      <img 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10 mt-1 flex-shrink-0" 
                        src={message.senderAvatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(message.senderName)}`} 
                        alt={message.senderName} 
                      />
                    )}
                    {!mine && !showAvatar && <div className="w-8"></div>}
                    <div className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md ${mine ? "order-1" : "order-2"}`}>
                      {!mine && showAvatar && (
                        <p className="text-xs font-bold text-slate-500 mb-1 px-3">
                          {message.senderName}
                        </p>
                      )}
                      {showTimestamp && (
                        <p className="text-[10px] uppercase font-black text-slate-400 text-center mb-4 mt-2 tracking-widest">
                          {new Date(message.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                      <div className="flex items-end gap-1">
                        {/* Delete button — for own messages or admin, shown on hover */}
                        {msgId && (mine || user.role === "admin") && (
                          <button
                            type="button"
                            title="Delete message"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex-shrink-0 mb-1"
                            onClick={() => deleteMessage(msgId)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 ${mine ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5"}`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
                        <span>{formatTimestamp(message.createdAt)}</span>
                        {mine && activeChat?.type === "direct" && (
                          <StatusIcon message={message} otherUserId={activeChat.id} />
                        )}
                      </div>
                    </div>
                    {mine && <div className="w-8"></div>}
                  </motion.div>
                );
              })}
              {typingLabel && (
                <div className="flex gap-2 justify-start px-2">
                  <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">?</span>
                  </div>
                  <div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

        {/* Message Input Area */}
        <div className="p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-4 p-4 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex flex-wrap gap-2 transition-all"
              >
                {emojiList.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    className="w-10 h-10 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-xl flex items-center justify-center"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmilePlus size={20} />
            </button>
            <input
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Type a message..."
              value={text}
              onChange={handleInputChange}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
            />
            <button
              type="button"
              className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 flex-shrink-0"
              onClick={sendMessage}
              disabled={!text.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mobile Chat List Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Chats</h1>
              <button
                type="button"
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => setShowMobileList(true)}
              >
                <Menu size={20} />
              </button>
            </div>

            {/* Mobile Chat List */}
            <div className="md:hidden flex-1 overflow-y-auto">
              {mode === "direct" && conversations.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Connect with friends to start chatting</p>
                </div>
              )}
              {mode === "project" && rooms.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No project rooms</p>
                  <p className="text-sm">Join a project to start collaborating</p>
                </div>
              )}

              {mode === "direct" && conversations.map((conversation) => {
                const active = activeChat?.type === "direct" && activeChat.id === conversation.id;
                const unreadCount = conversation.unreadCount || 0;
                return (
                  <button
                    type="button"
                    key={conversation.id}
                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                    onClick={() => { setActiveChat({ type: "direct", id: conversation.id }); setShowMobileList(false); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold">
                            {conversation.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {onlineUserIds.includes(conversation.id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {conversation.name}
                          </p>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-slate-500">
                              {formatTimestamp(conversation.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-slate-500 truncate">
                            {conversation.lastMessage || "Start a conversation"}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {mode === "project" && rooms.map((room) => {
                const active = activeChat?.type === "project" && activeChat.id === room.id;
                const unreadCount = room.unreadCount || 0;
                return (
                  <button
                    type="button"
                    key={room.id}
                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                    onClick={() => { setActiveChat({ type: "project", id: room.id }); setShowMobileList(false); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <Users size={20} className="text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {room.title}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {room.type || "Project"} • {room.members?.length || 0} members
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Empty State */}
            <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="text-center text-slate-500">
                <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select a chat</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
