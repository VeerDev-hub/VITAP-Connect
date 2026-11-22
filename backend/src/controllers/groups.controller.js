import { randomUUID } from "node:crypto";
import { mongoReady } from "../db/mongo.js";
import { GroupChat, GroupMessage } from "../models/index.js";
import { decryptMessage } from "../services/messageCrypto.js";

export async function create(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Chat unavailable" });
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Group name is required" });
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.filter(Boolean) : [];
  const members = [...new Set([req.user.id, ...memberIds])];
  const group = await GroupChat.create({ id: randomUUID(), name, creatorId: req.user.id, members });
  res.status(201).json({ group });
}

export async function list(req, res) {
  if (!(await mongoReady)) return res.json({ groups: [] });
  const groups = await GroupChat.find({ members: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ groups });
}

export async function messages(req, res) {
  if (!(await mongoReady)) return res.json({ messages: [] });
  const group = await GroupChat.findOne({ id: req.params.groupId, members: req.user.id }).lean();
  if (!group) return res.status(403).json({ message: "Not a member of this group" });
  const docs = await GroupMessage.find({ groupId: req.params.groupId }).sort({ createdAt: 1 }).limit(200).lean();
  res.json({ messages: docs.map((m) => ({ ...m, text: decryptMessage(m) })) });
}

export async function addMember(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
  const group = await GroupChat.findOne({ id: req.params.groupId, creatorId: req.user.id }).lean();
  if (!group) return res.status(403).json({ message: "Only the group creator can add members" });
  await GroupChat.updateOne({ id: req.params.groupId }, { $addToSet: { members: req.body.userId } });
  res.json({ message: "Member added" });
}

export async function removeMember(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Unavailable" });
  const group = await GroupChat.findOne({ id: req.params.groupId }).lean();
  if (!group) return res.status(404).json({ message: "Group not found" });
  const canRemove = group.creatorId === req.user.id || req.params.userId === req.user.id;
  if (!canRemove) return res.status(403).json({ message: "Not allowed" });
  await GroupChat.updateOne({ id: req.params.groupId }, { $pull: { members: req.params.userId } });
  res.json({ message: "Member removed" });
}
