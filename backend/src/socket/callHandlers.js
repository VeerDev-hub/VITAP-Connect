import { callDurationSeconds, createCallLog, findLatestCallLog, updateCallLog } from "../services/calls.js";

const INVITE_TIMEOUT_MS = 30000;

// roomId -> Map(socketId -> participant)
const callRooms = new Map();
// roomId -> invite (with its missed-call timeout)
const pendingCallInvites = new Map();

function clearPendingInvite(roomId) {
  const pending = pendingCallInvites.get(roomId);
  if (pending?.timeout) clearTimeout(pending.timeout);
  pendingCallInvites.delete(roomId);
}

export function removeSocketFromCallRooms(socket) {
  for (const [roomId, participants] of callRooms.entries()) {
    if (!participants.has(socket.id)) continue;
    const participant = participants.get(socket.id);
    participants.delete(socket.id);
    socket.to(`call:${roomId}`).emit("call:participant-left", { roomId, socketId: socket.id, userId: participant?.userId, userName: participant?.userName });
    if (participants.size === 0) callRooms.delete(roomId);
  }
}

export function registerCallHandlers(io, socket) {
  const userId = socket.user.id;
  const userName = () => socket.data.userName || "Student";

  socket.on("call:invite", async ({ toUserId, toUserName, roomId, callType, title }) => {
    if (!toUserId || !roomId) return;
    const invite = {
      roomId,
      toUserId,
      toUserName,
      fromUserId: userId,
      fromUserName: userName(),
      callType: callType || "video",
      title: title || "Private call"
    };

    clearPendingInvite(roomId);
    await createCallLog(invite);
    io.to(`user:${toUserId}`).emit("call:invite", invite);
    io.to(`user:${userId}`).emit("call:ringing", invite);

    const timeout = setTimeout(async () => {
      pendingCallInvites.delete(roomId);
      await updateCallLog(roomId, { status: "missed", endedAt: new Date() });
      io.to(`user:${userId}`).emit("call:missed", { roomId, toUserId, toUserName, title: invite.title, callType: invite.callType });
      io.to(`user:${toUserId}`).emit("call:invite-expired", { roomId, fromUserId: userId, fromUserName: invite.fromUserName, title: invite.title });
    }, INVITE_TIMEOUT_MS);

    pendingCallInvites.set(roomId, { ...invite, timeout });
  });

  socket.on("call:invite-response", async ({ toUserId, roomId, accepted, callType, title }) => {
    if (!toUserId || !roomId) return;
    clearPendingInvite(roomId);
    await updateCallLog(roomId, accepted
      ? { status: "accepted", acceptedAt: new Date() }
      : { status: "declined", endedAt: new Date() });
    io.to(`user:${toUserId}`).emit("call:invite-response", {
      roomId,
      fromUserId: userId,
      fromUserName: userName(),
      accepted: Boolean(accepted),
      callType: callType || "video",
      title: title || "Private call"
    });
  });

  // WebRTC signalling relay (offers, answers, ICE candidates).
  socket.on("call:signal", ({ roomId, targetSocketId, payload }) => {
    if (!roomId || !payload) return;
    const message = { roomId, fromSocketId: socket.id, fromUserId: userId, fromUserName: userName(), payload };
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:signal", message);
    } else {
      socket.to(`call:${roomId}`).emit("call:signal", message);
    }
  });

  socket.on("call:join", async ({ roomId, userName: joinName, callType, audioEnabled = true, videoEnabled = true, sharingScreen = false }) => {
    if (!roomId) return;
    socket.data.userName = joinName || socket.data.userName || "Student";
    socket.join(`call:${roomId}`);
    const participants = callRooms.get(roomId) || new Map();
    const existingParticipants = Array.from(participants.values());
    const participant = {
      socketId: socket.id,
      userId,
      userName: socket.data.userName,
      callType: callType || "video",
      audioEnabled: Boolean(audioEnabled),
      videoEnabled: Boolean(videoEnabled),
      sharingScreen: Boolean(sharingScreen)
    };
    participants.set(socket.id, participant);
    callRooms.set(roomId, participants);
    await updateCallLog(roomId, { status: "in-progress", acceptedAt: new Date() });
    socket.emit("call:participants", { roomId, participants: existingParticipants });
    socket.to(`call:${roomId}`).emit("call:participant-joined", { roomId, participant });
  });

  socket.on("call:media-state", ({ roomId, audioEnabled, videoEnabled, sharingScreen }) => {
    if (!roomId) return;
    const participants = callRooms.get(roomId);
    if (!participants?.has(socket.id)) return;
    const participant = {
      ...participants.get(socket.id),
      audioEnabled: Boolean(audioEnabled),
      videoEnabled: Boolean(videoEnabled),
      sharingScreen: Boolean(sharingScreen)
    };
    participants.set(socket.id, participant);
    socket.to(`call:${roomId}`).emit("call:media-state", { roomId, participant });
  });

  socket.on("call:leave", async ({ roomId }) => {
    if (!roomId) return;
    const participants = callRooms.get(roomId);
    if (!participants?.has(socket.id)) return;
    const participant = participants.get(socket.id);
    participants.delete(socket.id);
    socket.leave(`call:${roomId}`);
    socket.to(`call:${roomId}`).emit("call:participant-left", { roomId, socketId: socket.id, userId: participant?.userId, userName: participant?.userName });

    if (participants.size === 0) {
      callRooms.delete(roomId);
      const call = await findLatestCallLog(roomId);
      const endedAt = new Date();
      await updateCallLog(roomId, {
        endedAt,
        status: call?.status === "missed" ? "missed" : "completed",
        durationSeconds: callDurationSeconds({ acceptedAt: call?.acceptedAt, endedAt })
      });
    }
  });
}
