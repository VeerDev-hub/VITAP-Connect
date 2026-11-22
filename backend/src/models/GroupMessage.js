import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema({
  groupId: { type: String, index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const GroupMessage = mongoose.models.GroupMessage || mongoose.model("GroupMessage", groupMessageSchema);
