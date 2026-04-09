import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

export default function IncomingCallModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useMemo(() => getSocket(), []);
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);

  useEffect(() => {
    if (!user) return;

    socket.auth = { token: localStorage.getItem("vitap_connect_token") };
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { userName: user.name });

    const handleStartCall = ({ detail }) => {
      if (!detail) return;
      const payload = {
        roomId: detail.roomId,
        toUserId: detail.toUserId,
        toUserName: detail.toUserName,
        callType: detail.callType || "video",
        title: detail.title || `${user.name} and ${detail.toUserName}`,
        status: "ringing"
      };
      setOutgoingCall(payload);
      socket.emit("call:invite", payload);
    };

    const handleIncomingCall = (payload) => {
      setIncomingCall(payload);
    };

    const handleRinging = (payload) => {
      setOutgoingCall((current) => current && current.roomId === payload.roomId ? { ...current, status: "ringing" } : current);
    };

    const handleInviteResponse = (payload) => {
      if (payload.accepted) {
        setOutgoingCall((current) => current && current.roomId === payload.roomId ? { ...current, status: "accepted" } : current);
        toast.success(`${payload.fromUserName} joined the ${payload.callType} call`);
        navigate(`/project-call/${payload.roomId}?type=${payload.callType}&project=${encodeURIComponent(payload.title || `${user.name} and ${payload.fromUserName}`)}&private=1&peerId=${payload.fromUserId}&peerName=${encodeURIComponent(payload.fromUserName)}`);
        setTimeout(() => setOutgoingCall(null), 200);
      } else {
        setOutgoingCall(null);
        toast.error(`${payload.fromUserName} declined the call`);
      }
    };

    const handleMissed = (payload) => {
      setOutgoingCall((current) => current && current.roomId === payload.roomId ? null : current);
      toast.error(`${payload.toUserName || "The user"} missed your call`);
    };

    const handleInviteExpired = (payload) => {
      if (incomingCall?.roomId === payload.roomId) {
        setIncomingCall(null);
      }
    };

    window.addEventListener("vitap:start-call", handleStartCall);
    socket.on("call:invite", handleIncomingCall);
    socket.on("call:ringing", handleRinging);
    socket.on("call:invite-response", handleInviteResponse);
    socket.on("call:missed", handleMissed);
    socket.on("call:invite-expired", handleInviteExpired);

    return () => {
      window.removeEventListener("vitap:start-call", handleStartCall);
      socket.off("call:invite", handleIncomingCall);
      socket.off("call:ringing", handleRinging);
      socket.off("call:invite-response", handleInviteResponse);
      socket.off("call:missed", handleMissed);
      socket.off("call:invite-expired", handleInviteExpired);
    };
  }, [incomingCall?.roomId, navigate, socket, user]);

  function acceptCall() {
    socket.emit("call:invite-response", {
      toUserId: incomingCall.fromUserId,
      roomId: incomingCall.roomId,
      accepted: true,
      callType: incomingCall.callType,
      title: incomingCall.title
    });
    navigate(`/project-call/${incomingCall.roomId}?type=${incomingCall.callType}&project=${encodeURIComponent(incomingCall.title || `Call with ${incomingCall.fromUserName}`)}&private=1&peerId=${incomingCall.fromUserId}&peerName=${encodeURIComponent(incomingCall.fromUserName)}`);
    setIncomingCall(null);
  }

  function declineCall() {
    socket.emit("call:invite-response", {
      toUserId: incomingCall.fromUserId,
      roomId: incomingCall.roomId,
      accepted: false,
      callType: incomingCall.callType,
      title: incomingCall.title
    });
    setIncomingCall(null);
  }

  function cancelOutgoingCall() {
    if (!outgoingCall) return;
    socket.emit("call:invite-response", {
      toUserId: outgoingCall.toUserId,
      roomId: outgoingCall.roomId,
      accepted: false,
      callType: outgoingCall.callType,
      title: outgoingCall.title
    });
    setOutgoingCall(null);
  }

  return (
    <>
      {incomingCall && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-2xl bg-slate-100 p-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              {incomingCall.callType === "video" ? <Video size={20} /> : <Phone size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100">Incoming {incomingCall.callType} call</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{incomingCall.title || `${incomingCall.fromUserName} is calling`}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{incomingCall.fromUserName} wants to start a private {incomingCall.callType} call with you.</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className="flex-1 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white" onClick={acceptCall}>Accept</button>
            <button type="button" className="flex-1 rounded-full bg-rose-600 px-5 py-3 font-semibold text-white" onClick={declineCall}><PhoneOff className="mr-2 inline" size={18} /> Decline</button>
          </div>
        </div>
      )}

      {outgoingCall && (
        <div className="fixed inset-x-4 top-20 z-40 mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              {outgoingCall.callType === "video" ? <Video size={20} /> : <Phone size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Outgoing {outgoingCall.callType} call</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{outgoingCall.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{outgoingCall.toUserName} is {outgoingCall.status === "accepted" ? "joining" : "ringing..."}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <div className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-center text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
              {outgoingCall.status === "accepted" ? "Connecting..." : "Ringing..."}
            </div>
            <button type="button" className="rounded-full bg-rose-600 px-5 py-3 font-semibold text-white" onClick={cancelOutgoingCall}><PhoneOff className="mr-2 inline" size={18} /> Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
