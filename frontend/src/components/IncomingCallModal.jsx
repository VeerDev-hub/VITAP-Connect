import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";

function callUrl({ roomId, callType, title, peerId, peerName }) {
  return `/project-call/${roomId}?type=${callType}&project=${encodeURIComponent(title)}&private=1&peerId=${peerId}&peerName=${encodeURIComponent(peerName)}`;
}

function CallCard({ eyebrow, name, detail, callType, children, pulse }) {
  const Icon = callType === "video" ? Video : Phone;
  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-sm animate-fade-up rounded-xl border border-line bg-surface p-4 shadow-pop lg:bottom-6 lg:right-6 lg:left-auto lg:mx-0">
      <div className="flex items-center gap-3">
        <span className="relative">
          <Avatar name={name} size="lg" />
          {pulse && <span className="absolute inset-0 animate-ping rounded-md ring-2 ring-accent/60" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow flex items-center gap-1.5 text-accent"><Icon size={12} /> {eyebrow}</p>
          <p className="truncate text-lg font-semibold">{name}</p>
          <p className="truncate text-sm text-ink-2">{detail}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">{children}</div>
    </div>
  );
}

export default function IncomingCallModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useMemo(() => getSocket(), []);
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { userName: user.name });

    const onStartCall = ({ detail }) => {
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
    const onInvite = (payload) => setIncomingCall(payload);
    const onRinging = (payload) => setOutgoingCall((c) => (c && c.roomId === payload.roomId ? { ...c, status: "ringing" } : c));
    const onResponse = (payload) => {
      if (payload.accepted) {
        setOutgoingCall((c) => (c && c.roomId === payload.roomId ? { ...c, status: "accepted" } : c));
        navigate(callUrl({ roomId: payload.roomId, callType: payload.callType, title: payload.title || `${user.name} and ${payload.fromUserName}`, peerId: payload.fromUserId, peerName: payload.fromUserName }));
        setTimeout(() => setOutgoingCall(null), 200);
      } else {
        setOutgoingCall(null);
        toast.error(`${payload.fromUserName} declined the call`);
      }
    };
    const onMissed = (payload) => {
      setOutgoingCall((c) => (c && c.roomId === payload.roomId ? null : c));
      toast.error(`${payload.toUserName || "They"} didn't pick up`);
    };
    const onExpired = (payload) => setIncomingCall((c) => (c?.roomId === payload.roomId ? null : c));

    window.addEventListener("vitap:start-call", onStartCall);
    socket.on("call:invite", onInvite);
    socket.on("call:ringing", onRinging);
    socket.on("call:invite-response", onResponse);
    socket.on("call:missed", onMissed);
    socket.on("call:invite-expired", onExpired);
    return () => {
      window.removeEventListener("vitap:start-call", onStartCall);
      socket.off("call:invite", onInvite);
      socket.off("call:ringing", onRinging);
      socket.off("call:invite-response", onResponse);
      socket.off("call:missed", onMissed);
      socket.off("call:invite-expired", onExpired);
    };
  }, [navigate, socket, user]);

  function respond(call, accepted) {
    socket.emit("call:invite-response", { toUserId: call.fromUserId, roomId: call.roomId, accepted, callType: call.callType, title: call.title });
  }

  function accept() {
    respond(incomingCall, true);
    navigate(callUrl({ roomId: incomingCall.roomId, callType: incomingCall.callType, title: incomingCall.title || `Call with ${incomingCall.fromUserName}`, peerId: incomingCall.fromUserId, peerName: incomingCall.fromUserName }));
    setIncomingCall(null);
  }

  function decline() {
    respond(incomingCall, false);
    setIncomingCall(null);
  }

  function cancelOutgoing() {
    socket.emit("call:invite-response", { toUserId: outgoingCall.toUserId, roomId: outgoingCall.roomId, accepted: false, callType: outgoingCall.callType, title: outgoingCall.title });
    setOutgoingCall(null);
  }

  if (incomingCall) {
    return (
      <CallCard eyebrow={`Incoming ${incomingCall.callType} call`} name={incomingCall.fromUserName} detail="wants to talk with you" callType={incomingCall.callType} pulse>
        <button type="button" className="btn btn-secondary flex-1" onClick={decline}><PhoneOff size={16} /> Decline</button>
        <button type="button" className="btn flex-1 bg-ok text-white hover:bg-ok/90" onClick={accept}><Phone size={16} /> Accept</button>
      </CallCard>
    );
  }

  if (outgoingCall) {
    return (
      <CallCard eyebrow={`${outgoingCall.callType} call`} name={outgoingCall.toUserName} detail={outgoingCall.status === "accepted" ? "Connecting…" : "Ringing…"} callType={outgoingCall.callType} pulse={outgoingCall.status !== "accepted"}>
        <button type="button" className="btn btn-danger flex-1" onClick={cancelOutgoing}><PhoneOff size={16} /> Cancel</button>
      </CallCard>
    );
  }

  return null;
}
