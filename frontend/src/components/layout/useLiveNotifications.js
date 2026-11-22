import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";

// Notification list + unread markers, kept live over Socket.io.
export function useLiveNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();
    let active = true;

    api.get("/notifications")
      .then(({ data }) => active && setNotifications(data.notifications || []))
      .catch(() => {});

    const push = (message) => {
      setNotifications((current) => [{ message, id: `live-${Date.now()}`, createdAt: new Date().toISOString() }, ...current].slice(0, 15));
      setUnseen((n) => n + 1);
    };

    const onNotification = (data) => push(data.message);
    const onChat = (label) => (data) => {
      if (window.location.pathname.startsWith("/chat") || data.senderId === user.id) return;
      setHasUnreadChats(true);
      push(label(data));
    };
    const onDirect = onChat((d) => `New message from ${d.senderName}`);
    const onRoom = onChat((d) => `${d.senderName} posted in a team chat`);

    socket.on("notification", onNotification);
    socket.on("direct:message", onDirect);
    socket.on("project:message", onRoom);
    socket.on("group:message", onRoom);
    return () => {
      active = false;
      socket.off("notification", onNotification);
      socket.off("direct:message", onDirect);
      socket.off("project:message", onRoom);
      socket.off("group:message", onRoom);
    };
  }, [user]);

  const clearAll = useCallback(() => {
    api.delete("/notifications/clear").catch(() => {});
    setNotifications([]);
    setUnseen(0);
  }, []);

  const markSeen = useCallback(() => setUnseen(0), []);
  const clearUnreadChats = useCallback(() => setHasUnreadChats(false), []);

  return { notifications, unseen, markSeen, clearAll, hasUnreadChats, clearUnreadChats };
}
