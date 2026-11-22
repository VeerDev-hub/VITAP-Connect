import { mongoReady } from "../db/mongo.js";
import { readQuery } from "../db/neo4j.js";
import { DirectMessage, ProjectMessage } from "../models/index.js";
import { decryptMessage } from "../services/messageCrypto.js";
import { onlineUserIds } from "../services/presence.js";
import { areFriends } from "../services/students.js";
import { getIO } from "../socket/io.js";
import { directConversationId, serializeDirectMessage } from "../utils/messages.js";

const EMPTY_PREVIEW = "Start a conversation";

async function markConversationRead(conversationId, userId) {
  return DirectMessage.updateMany(
    { conversationId, recipientId: userId, readBy: { $ne: userId } },
    { $addToSet: { deliveredTo: userId, readBy: userId } }
  );
}

export async function conversations(req, res) {
  const result = await readQuery(`
    MATCH (:Student {id: $id})-[:FRIEND_OF]-(friend:Student)
    OPTIONAL MATCH (friend)-[:HAS_SKILL]->(skill:Skill)
    WITH friend, collect(DISTINCT skill.name) AS skills
    RETURN DISTINCT friend { .id, .name, .avatarUrl, .department, .year, skills: skills } AS conversation
    ORDER BY conversation.name
  `, { id: req.user.id });

  let list = result.records.map((record) => ({
    ...record.get("conversation"),
    lastMessage: EMPTY_PREVIEW,
    lastMessageAt: null,
    unreadCount: 0,
    isOnline: false
  }));

  if (await mongoReady) {
    const conversationIds = list.map((c) => directConversationId(req.user.id, c.id));
    const messages = await DirectMessage.find({ conversationId: { $in: conversationIds } }).sort({ createdAt: 1 }).lean();
    const summary = new Map();

    for (const message of messages) {
      const current = summary.get(message.conversationId) || { lastMessage: EMPTY_PREVIEW, lastMessageAt: null, unreadCount: 0 };
      current.lastMessage = decryptMessage(message);
      current.lastMessageAt = message.createdAt;
      if (message.recipientId === req.user.id && !message.readBy?.includes(req.user.id)) {
        current.unreadCount += 1;
      }
      summary.set(message.conversationId, current);
    }

    list = list.map((c) => {
      const s = summary.get(directConversationId(req.user.id, c.id));
      return {
        ...c,
        lastMessage: s?.lastMessage || c.lastMessage,
        lastMessageAt: s?.lastMessageAt || c.lastMessageAt,
        unreadCount: s?.unreadCount || 0
      };
    });
  }

  const online = new Set(onlineUserIds());
  list = list
    .map((c) => ({ ...c, isOnline: online.has(c.id) }))
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

  res.json({ conversations: list });
}

export async function messages(req, res) {
  if (!(await areFriends(req.user.id, req.params.userId))) {
    return res.status(403).json({ message: "Direct chat is only available with accepted connections" });
  }
  if (!(await mongoReady)) return res.json({ messages: [] });

  const conversationId = directConversationId(req.user.id, req.params.userId);
  const docs = await DirectMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(200).lean();
  await markConversationRead(conversationId, req.user.id);

  res.json({
    messages: docs.map((message) =>
      serializeDirectMessage(message, req.user.id === message.senderId ? message.recipientId : req.user.id)
    )
  });
}

export async function markRead(req, res) {
  if (!(await mongoReady)) return res.json({ updated: 0 });
  const result = await markConversationRead(directConversationId(req.user.id, req.params.userId), req.user.id);
  res.json({ updated: result.modifiedCount || 0 });
}

export async function deleteMessage(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Chat unavailable" });

  let message = await DirectMessage.findById(req.params.messageId);
  let Model = DirectMessage;
  if (!message) {
    message = await ProjectMessage.findById(req.params.messageId);
    Model = ProjectMessage;
  }

  if (!message) return res.status(404).json({ message: "Message not found" });
  if (message.senderId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "You can only delete your own messages" });
  }

  await Model.deleteOne({ _id: req.params.messageId });
  const roomId = message.groupId
    ? `group:${message.groupId}`
    : `user:${message.senderId === req.user.id ? message.recipientId : message.senderId}`;
  getIO().to(roomId).emit("chat:message_deleted", { messageId: req.params.messageId });

  res.json({ message: "Message deleted" });
}
