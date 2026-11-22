import mongoose from "mongoose";

const directMessageSchema = new mongoose.Schema({
  conversationId: { type: String, index: true, required: true },
  participants: { type: [String], index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  recipientId: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  deliveredTo: { type: [String], default: [] },
  readBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const DirectMessage = mongoose.models.DirectMessage || mongoose.model("DirectMessage", directMessageSchema);
