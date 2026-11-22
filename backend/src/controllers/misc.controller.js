// Small endpoints: health, call config/history, feedback, analytics, admin.
import { mongoReady } from "../db/mongo.js";
import { readQuery, runQuery } from "../db/neo4j.js";
import { CallLog, Feedback } from "../models/index.js";
import { buildIceServers, callDurationSeconds } from "../services/calls.js";
import { getStudentById, getStudentList } from "../services/students.js";
import { integer } from "../utils/normalize.js";

export function health(req, res) {
  res.json({ status: "ok", service: "vitap-connect-api" });
}

export async function callConfig(req, res) {
  res.json({ iceServers: await buildIceServers() });
}

export async function callHistory(req, res) {
  if (!(await mongoReady)) return res.json({ calls: [] });
  const calls = await CallLog.find({ $or: [{ callerId: req.user.id }, { calleeId: req.user.id }] })
    .sort({ startedAt: -1 })
    .limit(20)
    .lean();
  res.json({
    calls: calls.map((call) => {
      const outgoing = call.callerId === req.user.id;
      return {
        ...call,
        counterpartId: outgoing ? call.calleeId : call.callerId,
        counterpartName: outgoing ? call.calleeName : call.callerName,
        direction: outgoing ? "outgoing" : "incoming",
        durationSeconds: call.durationSeconds || callDurationSeconds(call)
      };
    })
  });
}

export async function submitFeedback(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Database not ready" });
  const { rating, message } = req.body;
  if (!rating || !message) return res.status(400).json({ message: "Rating and message are required" });
  const feedback = await Feedback.create({
    userId: req.user.id,
    userName: req.user.name || "Student",
    rating: Number(rating),
    message: message.trim()
  });
  res.status(201).json({ message: "Feedback submitted successfully", feedback });
}

export async function listFeedback(req, res) {
  if (!(await mongoReady)) return res.status(503).json({ message: "Database not ready" });
  const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();
  res.json({ feedbacks });
}

export async function analyticsSummary(req, res) {
  const result = await readQuery(`
    MATCH (student:Student)
    OPTIONAL MATCH (project:Project)
    OPTIONAL MATCH ()-[connection:FRIEND_OF]->()
    RETURN count(DISTINCT student) AS students, count(DISTINCT project) AS projects, count(DISTINCT connection) AS connections
  `);
  const record = result.records[0];
  res.json({
    summary: {
      students: integer(record.get("students")),
      projects: integer(record.get("projects")),
      connections: integer(record.get("connections"))
    }
  });
}

export async function adminListUsers(req, res) {
  res.json({ users: await getStudentList("true", {}) });
}

export async function adminSetUserStatus(req, res) {
  const status = req.body.status === "blocked" ? "blocked" : "active";
  await runQuery("MATCH (s:Student {id: $id}) SET s.status = $status", { id: req.params.id, status });
  res.json({ user: await getStudentById(req.params.id) });
}
