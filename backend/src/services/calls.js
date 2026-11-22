import { config } from "../config/env.js";
import { mongoReady } from "../db/mongo.js";
import { CallLog } from "../models/index.js";

export async function createCallLog(invite) {
  if (!(await mongoReady)) return null;
  return CallLog.create({
    roomId: invite.roomId,
    callerId: invite.fromUserId,
    callerName: invite.fromUserName,
    calleeId: invite.toUserId,
    calleeName: invite.toUserName || "Student",
    callType: invite.callType || "video",
    title: invite.title || "Private call",
    status: "ringing",
    startedAt: new Date()
  });
}

export async function updateCallLog(roomId, updates) {
  if (!(await mongoReady)) return;
  await CallLog.findOneAndUpdate({ roomId }, updates, { sort: { startedAt: -1 } });
}

export async function findLatestCallLog(roomId) {
  if (!(await mongoReady)) return null;
  return CallLog.findOne({ roomId }).sort({ startedAt: -1 }).lean();
}

export function callDurationSeconds(call) {
  if (!call?.acceptedAt || !call?.endedAt) return 0;
  return Math.max(0, Math.round((new Date(call.endedAt).getTime() - new Date(call.acceptedAt).getTime()) / 1000));
}

export async function buildIceServers() {
  const { stunUrls, turnSource, turnUsername, turnCredential } = config.ice;
  const iceServers = [];

  if (stunUrls.length) {
    iceServers.push({ urls: stunUrls });
  }

  // A URL source (e.g. Metered) returns ready-made ICE server credentials.
  if (turnSource.startsWith("http")) {
    try {
      const response = await fetch(turnSource);
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (data.iceServers) return data.iceServers;
    } catch (error) {
      console.error("Failed to fetch TURN credentials from API:", error.message);
    }
  }

  const turnUrls = turnSource.split(",").map((v) => v.trim()).filter(Boolean);
  if (turnUrls.length && turnUsername && turnCredential) {
    iceServers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
  }

  return iceServers;
}
