import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellDot, Check, CheckCheck, Clock3, MessageSquare, Phone, Send, SmilePlus, Users, Video, MoreVertical, Menu, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    if (shouldAutoScroll && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingLabel, shouldAutoScroll]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setShouldAutoScroll(isNearBottom);
    }
  };

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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-80 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Chats</h1>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`p-2 rounded-lg ${mode === "direct" ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                  onClick={() => setMode("direct")}
                >
                  <MessageSquare size={20} />
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-lg ${mode === "project" ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                  onClick={() => setMode("project")}
                >
                  <Users size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
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
                    className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                    onClick={() => {
                      setActiveChat({ type: "direct", id: conversation.id });
                      setSidebarOpen(false);
                    }}
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
                    className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                    onClick={() => {
                      setActiveChat({ type: "project", id: room.id });
                      setSidebarOpen(false);
                    }}
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
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-80 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Chats</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className={`p-2 rounded-lg ${mode === "direct" ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
              onClick={() => setMode("direct")}
            >
              <MessageSquare size={20} />
            </button>
            <button
              type="button"
              className={`p-2 rounded-lg ${mode === "project" ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
              onClick={() => setMode("project")}
            >
              <Users size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
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
                className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                onClick={() => setActiveChat({ type: "direct", id: conversation.id })}
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
                className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${active ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                onClick={() => setActiveChat({ type: "project", id: room.id })}
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
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeItem ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  type="button"
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                  {activeChat?.type === "direct" ? (
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">
                      {activeItem.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <Users size={20} className="text-slate-600 dark:text-slate-300" />
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
                <div className="flex gap-2">
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
                  <button
                    type="button"
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <MoreVertical size={20} />
                  </button>
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
                const prevMessage = messages[index - 1];
                const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;
                const showTimestamp = !prevMessage || new Date(message.createdAt) - new Date(prevMessage.createdAt) > 300000; // 5 minutes

                return (
                  <div key={`${message.createdAt}-${index}`} className={`flex gap-2 px-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && showAvatar && (
                      <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          {message.senderName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!mine && !showAvatar && <div className="w-8"></div>}
                    <div className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md ${mine ? "order-1" : "order-2"}`}>
                      {!mine && showAvatar && (
                        <p className="text-xs text-slate-500 mb-1 px-3">
                          {message.senderName}
                        </p>
                      )}
                      {showTimestamp && (
                        <p className="text-xs text-slate-400 text-center mb-2">
                          {new Date(message.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                      <div className={`rounded-2xl px-4 py-2 ${mine ? "bg-blue-500 text-white" : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white"}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-xs text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
                        <span>{formatTimestamp(message.createdAt)}</span>
                        {mine && activeChat?.type === "direct" && (
                          <StatusIcon message={message} otherUserId={activeChat.id} />
                        )}
                      </div>
                    </div>
                    {mine && <div className="w-8"></div>}
                  </div>
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

            {/* Message Input */}
            <div className="p-2 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {showEmojiPicker && (
                <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {emojiList.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                onClick={() => setSidebarOpen(true)}
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
                    onClick={() => setActiveChat({ type: "direct", id: conversation.id })}
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
                    onClick={() => setActiveChat({ type: "project", id: room.id })}
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
