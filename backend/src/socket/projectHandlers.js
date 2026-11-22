import { randomUUID } from "node:crypto";
import { mongoReady } from "../db/mongo.js";
import { ProjectMessage } from "../models/index.js";
import { encryptMessage } from "../services/messageCrypto.js";

export function registerProjectHandlers(io, socket) {
  const userId = socket.user.id;
  const userName = () => socket.data.userName || "Student";

  socket.on("project:join", ({ projectId }) => {
    if (projectId) socket.join(`project:${projectId}`);
  });

  socket.on("project:typing", ({ projectId, isTyping }) => {
    if (!projectId) return;
    socket.to(`project:${projectId}`).emit("project:typing", {
      projectId,
      fromUserId: userId,
      userName: userName(),
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("project:message", async ({ projectId, text }) => {
    if (!projectId || !text?.trim()) return;
    const body = text.trim();
    const message = {
      id: randomUUID(),
      projectId,
      senderId: userId,
      senderName: userName(),
      deliveredTo: [userId],
      readBy: [userId],
      createdAt: new Date()
    };

    io.to(`project:${projectId}`).emit("project:message", { ...message, text: body });

    if (await mongoReady) {
      ProjectMessage.create({ ...message, ...encryptMessage(body) }).catch((err) => console.error("Async Project Msg save failed:", err));
    }
  });
}
