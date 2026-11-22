import { randomUUID } from "node:crypto";
import { mongoReady } from "../db/mongo.js";
import { GroupChat, GroupMessage } from "../models/index.js";
import { encryptMessage } from "../services/messageCrypto.js";
import { isUserOnline } from "../services/presence.js";
import { sendPushToUser } from "../services/push.js";
import { previewText } from "../utils/messages.js";

async function findMembership(groupId, userId) {
  if (!(await mongoReady)) return null;
  return GroupChat.findOne({ id: groupId, members: userId }).lean();
}

export function registerGroupHandlers(io, socket) {
  const userId = socket.user.id;
  const userName = () => socket.data.userName || "Student";

  socket.on("group:join", async ({ groupId }) => {
    if (!groupId) return;
    if (await findMembership(groupId, userId)) socket.join(`group:${groupId}`);
  });

  socket.on("group:typing", ({ groupId, isTyping }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:typing", {
      groupId,
      fromUserId: userId,
      userName: userName(),
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("group:message", async ({ groupId, text }) => {
    if (!groupId || !text?.trim()) return;
    const group = await findMembership(groupId, userId);
    if (!group) return;

    const body = text.trim();
    const message = { id: randomUUID(), groupId, senderId: userId, senderName: userName(), createdAt: new Date() };

    io.to(`group:${groupId}`).emit("group:message", { ...message, text: body });
    GroupMessage.create({ ...message, ...encryptMessage(body) }).catch((err) => console.error("Async Group Msg save failed:", err));

    for (const memberId of group.members.filter((m) => m !== userId && !isUserOnline(m))) {
      sendPushToUser(memberId, {
        title: `${socket.data.userName || "Someone"} in ${group.name}`,
        body: previewText(body),
        url: "/chat"
      }).catch(() => {});
    }
  });
}
