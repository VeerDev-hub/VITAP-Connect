import mongoose from "mongoose";

const projectMessageSchema = new mongoose.Schema({
  projectId: { type: String, index: true, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  cipherText: { type: String },
  iv: { type: String },
  authTag: { type: String },
  deliveredTo: { type: [String], default: [] },
  readBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const ProjectMessage = mongoose.models.ProjectMessage || mongoose.model("ProjectMessage", projectMessageSchema);
