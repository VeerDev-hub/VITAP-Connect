// In-memory map of userId -> Set of connected socket ids.
// Single-process only: move to Redis if the API is ever scaled horizontally.
const onlineUsers = new Map();

export function addUserSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId) || new Set();
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
}

export function removeUserSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
}

export function onlineUserIds() {
  return [...onlineUsers.keys()];
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}
