import mongoose from "mongoose";

const groupChatSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true, required: true },
  name: { type: String, required: true },
  creatorId: { type: String, required: true },
  members: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const GroupChat = mongoose.models.GroupChat || mongoose.model("GroupChat", groupChatSchema);
