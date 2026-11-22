// Holds the Socket.io server so HTTP controllers can emit real-time events.
let io;

export function setIO(server) {
  io = server;
}

export function getIO() {
  if (!io) throw new Error("Socket.io server has not been initialised");
  return io;
}

export function emitToUser(userId, event, payload) {
  getIO().to(`user:${userId}`).emit(event, payload);
}
