import { randomUUID } from "node:crypto";
import { mongoReady } from "../db/mongo.js";
import { DirectMessage } from "../models/index.js";
import { encryptMessage } from "../services/messageCrypto.js";
import { isUserOnline } from "../services/presence.js";
import { sendPushToUser } from "../services/push.js";
import { areFriends } from "../services/students.js";
import { directConversationId, previewText } from "../utils/messages.js";

export function registerDirectHandlers(io, socket) {
  const userId = socket.user.id;
  const userName = () => socket.data.userName || "Student";

  socket.on("direct:join", async ({ otherUserId }) => {
    if (!otherUserId) return;
    const conversationId = directConversationId(userId, otherUserId);
    socket.join(`direct:${conversationId}`);
    if (await mongoReady) {
      await DirectMessage.updateMany(
        { conversationId, recipientId: userId, deliveredTo: { $ne: userId } },
        { $addToSet: { deliveredTo: userId } }
      );
    }
    io.to(`direct:${conversationId}`).emit("direct:delivered", { conversationId, recipientId: userId });
    io.to(`user:${otherUserId}`).emit("direct:delivered", { conversationId, recipientId: userId });
  });

  socket.on("direct:typing", ({ recipientId, isTyping }) => {
    if (!recipientId) return;
    io.to(`direct:${directConversationId(userId, recipientId)}`).emit("direct:typing", {
      fromUserId: userId,
      userName: userName(),
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("direct:read", async ({ otherUserId }) => {
    if (!otherUserId) return;
    const conversationId = directConversationId(userId, otherUserId);
    if (await mongoReady) {
      await DirectMessage.updateMany(
        { conversationId, recipientId: userId, readBy: { $ne: userId } },
        { $addToSet: { deliveredTo: userId, readBy: userId } }
      );
    }
    io.to(`direct:${conversationId}`).emit("direct:read", { conversationId, readerId: userId });
    io.to(`user:${otherUserId}`).emit("direct:read", { conversationId, readerId: userId });
  });

  socket.on("direct:message", async ({ recipientId, text }) => {
    if (!recipientId || !text?.trim()) return;
    if (!(await areFriends(userId, recipientId))) return;

    const body = text.trim();
    const conversationId = directConversationId(userId, recipientId);
    const recipientOnline = isUserOnline(recipientId);
    const deliveredTo = recipientOnline ? [userId, recipientId] : [userId];
    const message = {
      id: randomUUID(),
      conversationId,
      participants: [userId, recipientId],
      senderId: userId,
      senderName: userName(),
      recipientId,
      deliveredTo,
      readBy: [userId],
      createdAt: new Date()
    };

    // Emit first for low latency, persist asynchronously.
    io.to(`direct:${conversationId}`).emit("direct:message", { ...message, text: body, status: recipientOnline ? "delivered" : "sent" });

    if (await mongoReady) {
      DirectMessage.create({ ...message, ...encryptMessage(body) }).catch((err) => console.error("Async DM save failed:", err));
    }

    if (!recipientOnline) {
      sendPushToUser(recipientId, {
        title: `New message from ${socket.data.userName || "Someone"}`,
        body: previewText(body),
        url: "/chat"
      }).catch(() => {});
    }
  });
}
