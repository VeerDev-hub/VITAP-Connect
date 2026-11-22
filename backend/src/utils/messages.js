import { decryptMessage } from "../services/messageCrypto.js";

export function directConversationId(userA, userB) {
  return [userA, userB].sort().join(":");
}

export function previewText(text, max = 60) {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

export function messageStatus(message, viewerId) {
  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  const deliveredTo = Array.isArray(message.deliveredTo) ? message.deliveredTo : [];
  return {
    deliveredTo,
    readBy,
    status: viewerId && readBy.includes(viewerId) ? "read" : viewerId && deliveredTo.includes(viewerId) ? "delivered" : "sent"
  };
}

function plain(message) {
  return typeof message.toObject === "function" ? message.toObject() : message;
}

export function serializeDirectMessage(message, viewerId) {
  const source = plain(message);
  return { ...source, text: decryptMessage(source), ...messageStatus(source, viewerId) };
}

export function serializeProjectMessage(message) {
  const source = plain(message);
  return {
    ...source,
    text: decryptMessage(source),
    deliveredTo: Array.isArray(source.deliveredTo) ? source.deliveredTo : [],
    readBy: Array.isArray(source.readBy) ? source.readBy : []
  };
}
