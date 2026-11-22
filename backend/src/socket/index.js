import jwt from "jsonwebtoken";
import { Server as SocketServer } from "socket.io";
import { config } from "../config/env.js";
import { AUTH_COOKIE } from "../middleware/auth.js";
import { addUserSocket, onlineUserIds, removeUserSocket } from "../services/presence.js";
import { registerCallHandlers, removeSocketFromCallRooms } from "./callHandlers.js";
import { registerDirectHandlers } from "./directHandlers.js";
import { registerGroupHandlers } from "./groupHandlers.js";
import { setIO } from "./io.js";
import { registerProjectHandlers } from "./projectHandlers.js";

function tokenFromHandshake(socket) {
  if (socket.handshake.auth?.token) return socket.handshake.auth.token;
  const cookieHeader = socket.request.headers.cookie;
  if (!cookieHeader) return null;
  const jwtCookie = cookieHeader.split(";").find((c) => c.trim().startsWith(`${AUTH_COOKIE}=`));
  return jwtCookie ? jwtCookie.split("=")[1] : null;
}

function authenticate(socket, next) {
  const token = tokenFromHandshake(socket);
  if (!token) return next(new Error("Unauthorized"));
  try {
    socket.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}

export function createSocketServer(httpServer) {
  const io = new SocketServer(httpServer, { cors: { origin: config.clientUrls, credentials: true } });
  setIO(io);

  const emitPresence = () => io.emit("presence:update", { userIds: onlineUserIds() });

  io.use(authenticate);

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    addUserSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    emitPresence();

    socket.on("presence:join", ({ userName }) => {
      socket.data.userName = userName || socket.data.userName || "Student";
      removeSocketFromCallRooms(socket);
      emitPresence();
    });

    registerDirectHandlers(io, socket);
    registerProjectHandlers(io, socket);
    registerGroupHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
      emitPresence();
    });
  });

  return io;
}
