import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LoaderCircle, Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, Pin, ScreenShareOff, Video, VideoOff, Users } from "lucide-react";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const fallbackIceServers = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
];

function VideoTile({ title, subtitle, stream, muted = false, isVideoEnabled = true, isAudioEnabled = true, local = false, sharingScreen = false, pinned = false, tall = false, onPin }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <button type="button" onClick={onPin} className={`relative overflow-hidden rounded-[2rem] border text-left w-full ${pinned ? "border-blue-400 ring-2 ring-blue-400/40" : "border-white/10"} bg-slate-900`}>
      {stream && isVideoEnabled ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || local} className={`${tall ? "h-[60vh]" : "h-56"} w-full bg-slate-950 object-cover`} />
      ) : (
        <div className={`flex ${tall ? "h-[60vh]" : "h-56"} items-center justify-center bg-slate-800`}>
          <div className="text-center text-slate-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
              {title?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <p className="mt-3 text-sm font-semibold">{sharingScreen ? "Screen sharing" : isVideoEnabled ? "Waiting for video..." : "Camera off"}</p>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 py-4 text-white">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{title}</p>
            {sharingScreen && <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Sharing screen</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-200">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${isAudioEnabled ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>{isAudioEnabled ? "Mic on" : "Muted"}</span>
          <span className={`rounded-full px-2 py-1 ${isVideoEnabled || sharingScreen ? "bg-sky-500/20 text-sky-200" : "bg-slate-500/20 text-slate-200"}`}>{sharingScreen ? "Screen on" : isVideoEnabled ? "Video on" : "Video off"}</span>
        </div>
      </div>
    </button>
  );
}

export default function ProjectCall() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useMemo(() => getSocket(), []);
  const localVideoRef = useRef(null);
  const iceServersRef = useRef(fallbackIceServers);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const joinedRef = useRef(false);
  const cleanupHandlersRef = useRef(() => {});
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState((searchParams.get("type") || "video") !== "voice");
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [pinnedTileId, setPinnedTileId] = useState("local");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pinnedWrapperRef = useRef(null);

  const type = searchParams.get("type") || "video";
  const project = searchParams.get("project") || "Project room";
  const peerName = searchParams.get("peerName") || "Teammate";
  const isPrivateCall = searchParams.get("private") === "1";
  const isVoiceRoom = type === "voice";

  function stageCandidates() {
    return [
      {
        id: "local",
        title: "You",
        subtitle: isPrivateCall ? "Private call" : isVoiceRoom ? "Voice room" : "Project room",
        stream: screenStreamRef.current || localStreamRef.current,
        isAudioEnabled: isMicEnabled,
        isVideoEnabled: isSharingScreen || isCameraEnabled,
        sharingScreen: isSharingScreen,
        local: true
      },
      ...remoteParticipants.map((participant) => ({
        id: participant.socketId,
        title: participant.userName,
        subtitle: participant.callType === "voice" ? "Voice participant" : "Connected teammate",
        stream: participant.stream,
        isAudioEnabled: participant.audioEnabled,
        isVideoEnabled: participant.videoEnabled,
        sharingScreen: participant.sharingScreen,
        local: false
      }))
    ];
  }

  const stageItems = stageCandidates();
  const pinnedItem = stageItems.find((item) => item.id === pinnedTileId) || stageItems.find((item) => item.sharingScreen) || stageItems[0];
  const thumbnailItems = stageItems.filter((item) => item.id !== pinnedItem?.id);

  useEffect(() => {
    // 1. Prioritize screen sharers
    const sharer = stageItems.find((item) => item.sharingScreen && item.id !== pinnedTileId);
    if (sharer) {
      setPinnedTileId(sharer.id);
      return;
    }

    // 2. Prioritize remote participants over local view if nothing is pinned/local is pinned
    if (pinnedTileId === "local" && remoteParticipants.length > 0) {
      setPinnedTileId(remoteParticipants[0].socketId);
    }
  }, [remoteParticipants.length, isSharingScreen, pinnedTileId]);

  function upsertRemoteParticipant(participant, patch = {}) {
    setRemoteParticipants((current) => {
      const existing = current.find((item) => item.socketId === participant.socketId);
      return existing
        ? current.map((item) => item.socketId === participant.socketId ? { ...item, ...participant, ...patch } : item)
        : [...current, { ...participant, ...patch, stream: patch.stream || null }];
    });
  }

  function removeRemoteParticipant(socketId) {
    setRemoteParticipants((current) => current.filter((participant) => participant.socketId !== socketId));
    setPinnedTileId((current) => current === socketId ? "local" : current);
  }

  function toggleFullscreen() {
    const el = pinnedWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  // Sync state when user presses Escape to exit fullscreen
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function closePeerConnection(socketId) {
    const connection = peerConnectionsRef.current.get(socketId);
    if (connection) {
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.close();
      peerConnectionsRef.current.delete(socketId);
    }
  }

  function attachLocalPreview(stream) {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream || null;
    }
  }

  async function fetchCallConfig() {
    try {
      const { data } = await api.get("/config/call");
      if (Array.isArray(data.iceServers) && data.iceServers.length) {
        iceServersRef.current = data.iceServers;
      }
    } catch {
      iceServersRef.current = fallbackIceServers;
    }
  }

  async function getLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    const preferredConstraints = isVoiceRoom
      ? { audio: true, video: false }
      : { audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      localStreamRef.current = stream;
      attachLocalPreview(stream);
      setIsMicEnabled(stream.getAudioTracks().every((track) => track.enabled));
      setIsCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks().every((track) => track.enabled));
      return stream;
    } catch (primaryError) {
      if (!isVoiceRoom) {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = fallbackStream;
        attachLocalPreview(fallbackStream);
        setIsMicEnabled(true);
        setIsCameraEnabled(false);
        setError("Camera was unavailable, so the room joined in audio-only mode.");
        return fallbackStream;
      }
      throw primaryError;
    }
  }

  async function replaceOutgoingVideoTrack(nextTrack) {
    const replacements = [];
    peerConnectionsRef.current.forEach((peerConnection) => {
      const sender = peerConnection.getSenders().find((item) => item.track?.kind === "video");
      if (sender) {
        replacements.push(sender.replaceTrack(nextTrack || null));
      }
    });
    await Promise.all(replacements);
  }

  async function stopScreenShare() {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    attachLocalPreview(localStreamRef.current);
    await replaceOutgoingVideoTrack(localStreamRef.current?.getVideoTracks()?.[0] || null);
  }

  async function createPeerConnection(participant, shouldCreateOffer) {
    if (!participant?.socketId || participant.socketId === socket.id) return peerConnectionsRef.current.get(participant.socketId);
    if (peerConnectionsRef.current.has(participant.socketId)) return peerConnectionsRef.current.get(participant.socketId);

    const stream = await getLocalStream();
    const peerConnection = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerConnectionsRef.current.set(participant.socketId, peerConnection);
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = (event) => {
      upsertRemoteParticipant(participant, { stream: event.streams[0] });
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit("call:signal", {
        roomId,
        targetSocketId: participant.socketId,
        payload: { type: "ice-candidate", candidate: event.candidate }
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
        closePeerConnection(participant.socketId);
        removeRemoteParticipant(participant.socketId);
      }
    };

    if (shouldCreateOffer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("call:signal", {
        roomId,
        targetSocketId: participant.socketId,
        payload: { type: "offer", sdp: offer }
      });
    }

    return peerConnection;
  }

  async function handleSignalMessage({ fromSocketId, fromUserId, fromUserName, payload }) {
    if (!payload?.type || !fromSocketId) return;
    const participant = { socketId: fromSocketId, userId: fromUserId, userName: fromUserName, audioEnabled: true, videoEnabled: true, sharingScreen: false };
    upsertRemoteParticipant(participant);
    const peerConnection = await createPeerConnection(participant, false);

    if (payload.type === "offer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("call:signal", {
        roomId,
        targetSocketId: fromSocketId,
        payload: { type: "answer", sdp: answer }
      });
      return;
    }

    if (payload.type === "answer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      return;
    }

    if (payload.type === "ice-candidate" && payload.candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
      }
    }
  }

  useEffect(() => {
    let active = true;
    async function joinRoom() {
      try {
        await fetchCallConfig();
        await getLocalStream();
        socket.auth = { token: localStorage.getItem("vitap_connect_token") };
        if (!socket.connected) socket.connect();

        const handleParticipants = async ({ participants }) => {
          if (!active) return;
          setRemoteParticipants(participants.map((participant) => ({ ...participant, stream: null })));
          for (const participant of participants) {
            await createPeerConnection(participant, true);
          }
        };

        const handleParticipantJoined = ({ participant }) => {
          if (!active || !participant || participant.socketId === socket.id) return;
          upsertRemoteParticipant(participant);
        };

        const handleParticipantLeft = ({ socketId }) => {
          closePeerConnection(socketId);
          removeRemoteParticipant(socketId);
        };

        const handleMediaState = ({ participant }) => {
          if (!participant?.socketId) return;
          upsertRemoteParticipant(participant);
        };

        const handleSignal = (message) => {
          handleSignalMessage(message).catch(() => setError("A participant connection could not be completed. You can retry by rejoining the room."));
        };

        socket.on("call:participants", handleParticipants);
        socket.on("call:participant-joined", handleParticipantJoined);
        socket.on("call:participant-left", handleParticipantLeft);
        socket.on("call:media-state", handleMediaState);
        socket.on("call:signal", handleSignal);

        cleanupHandlersRef.current = () => {
          socket.off("call:participants", handleParticipants);
          socket.off("call:participant-joined", handleParticipantJoined);
          socket.off("call:participant-left", handleParticipantLeft);
          socket.off("call:media-state", handleMediaState);
          socket.off("call:signal", handleSignal);
        };

        if (!joinedRef.current) {
          socket.emit("call:join", {
            roomId,
            userName: user.name,
            callType: type,
            audioEnabled: true,
            videoEnabled: !isVoiceRoom && isCameraEnabled,
            sharingScreen: false
          });
          joinedRef.current = true;
        }

        setLoading(false);
      } catch (callError) {
        setError(callError?.message || "We could not access your microphone or camera.");
        setLoading(false);
      }
    }

    joinRoom();

    return () => {
      active = false;
      cleanupHandlersRef.current();
      socket.emit("call:leave", { roomId });
      joinedRef.current = false;
      peerConnectionsRef.current.forEach((_, socketId) => closePeerConnection(socketId));
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId, socket, type, user.name]);

  useEffect(() => {
    attachLocalPreview(screenStreamRef.current || localStreamRef.current);
  }, [loading, isSharingScreen]);

  function updateMediaState({ audioEnabled, videoEnabled, sharingScreen }) {
    socket.emit("call:media-state", { roomId, audioEnabled, videoEnabled, sharingScreen });
  }

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMicEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsMicEnabled(next);
    updateMediaState({ audioEnabled: next, videoEnabled: isCameraEnabled || isSharingScreen, sharingScreen: isSharingScreen });
  }

  function toggleCamera() {
    if (isVoiceRoom || isSharingScreen) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCameraEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsCameraEnabled(next);
    updateMediaState({ audioEnabled: isMicEnabled, videoEnabled: next, sharingScreen: false });
  }

  async function toggleScreenShare() {
    if (isVoiceRoom) return;
    if (isSharingScreen) {
      await stopScreenShare();
      updateMediaState({ audioEnabled: isMicEnabled, videoEnabled: isCameraEnabled, sharingScreen: false });
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;
      setIsSharingScreen(true);
      attachLocalPreview(displayStream);
      setPinnedTileId("local");
      await replaceOutgoingVideoTrack(screenTrack);
      updateMediaState({ audioEnabled: isMicEnabled, videoEnabled: true, sharingScreen: true });
      screenTrack.onended = () => {
        stopScreenShare().catch(() => {});
        updateMediaState({ audioEnabled: isMicEnabled, videoEnabled: isCameraEnabled, sharingScreen: false });
      };
    } catch {
      setError("Screen sharing was cancelled or blocked by the browser.");
    }
  }

  function leaveRoom() {
    socket.emit("call:leave", { roomId });
    navigate(isPrivateCall ? "/chat" : "/collaborations");
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white border border-white/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">{isVoiceRoom ? "Voice" : "Video"} collaboration room</span>
            <h1 className="mt-5 font-display text-4xl font-bold">{isPrivateCall ? `${project} private call` : project}</h1>
            <p className="mt-2 text-slate-300">Room ID: {roomId}</p>
            {isPrivateCall && <p className="mt-2 text-sm text-slate-400">Connected with {peerName}</p>}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <p className="font-semibold">{remoteParticipants.length + 1} participants in room</p>
            <p className="mt-1 inline-flex items-center gap-2 text-slate-300"><Users size={16} /> WebRTC with STUN/TURN-ready ICE servers and live media streams</p>
          </div>
        </div>

        {error && <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{error}</div>}

        {loading ? (
          <div className="mt-10 flex min-h-80 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 text-slate-200">
            <div className="text-center">
              <LoaderCircle className="mx-auto animate-spin" size={32} />
              <p className="mt-4 font-semibold">Connecting to the meeting room...</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {pinnedItem && (
              <div ref={pinnedWrapperRef} className="rounded-[2rem] border border-white/10 bg-slate-900 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-2">
                  <div>
                    <p className="text-lg font-semibold">Focused view: {pinnedItem.title}</p>
                    <p className="text-sm text-slate-300">Click any tile below to pin it here.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinnedItem.sharingScreen && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">Sharing screen</span>}
                    {/* Fullscreen toggle */}
                    <button
                      type="button"
                      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                      className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </div>
                </div>
                <VideoTile
                  title={pinnedItem.title}
                  subtitle={pinnedItem.subtitle}
                  stream={pinnedItem.stream}
                  isAudioEnabled={pinnedItem.isAudioEnabled}
                  isVideoEnabled={pinnedItem.isVideoEnabled}
                  sharingScreen={pinnedItem.sharingScreen}
                  local={pinnedItem.local}
                  muted={pinnedItem.local}
                  pinned
                  tall
                  onPin={() => setPinnedTileId(pinnedItem.id)}
                />
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {thumbnailItems.map((item) => (
                <VideoTile
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  stream={item.stream}
                  isAudioEnabled={item.isAudioEnabled}
                  isVideoEnabled={item.isVideoEnabled}
                  sharingScreen={item.sharingScreen}
                  local={item.local}
                  muted={item.local}
                  onPin={() => setPinnedTileId(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className={`rounded-full px-5 py-3 font-semibold ${isMicEnabled ? "bg-white/10" : "bg-rose-500/20 text-rose-100"}`} onClick={toggleMic}>
            {isMicEnabled ? <Mic className="mr-2 inline" size={18} /> : <MicOff className="mr-2 inline" size={18} />} {isMicEnabled ? "Mute" : "Unmute"}
          </button>
          {!isVoiceRoom && (
            <button type="button" className={`rounded-full px-5 py-3 font-semibold ${isCameraEnabled ? "bg-white/10" : "bg-slate-700 text-slate-100"}`} onClick={toggleCamera} disabled={isSharingScreen}>
              {isCameraEnabled ? <Video className="mr-2 inline" size={18} /> : <VideoOff className="mr-2 inline" size={18} />} {isCameraEnabled ? "Camera off" : "Camera on"}
            </button>
          )}
          {!isVoiceRoom && (
            <button type="button" className={`rounded-full px-5 py-3 font-semibold ${isSharingScreen ? "bg-emerald-600 text-white" : "bg-white/10"}`} onClick={toggleScreenShare}>
              {isSharingScreen ? <ScreenShareOff className="mr-2 inline" size={18} /> : <MonitorUp className="mr-2 inline" size={18} />} {isSharingScreen ? "Stop sharing" : "Share screen"}
            </button>
          )}
          <button type="button" className="rounded-full bg-rose-600 px-5 py-3 font-semibold" onClick={leaveRoom}><PhoneOff className="mr-2 inline" size={18} /> Leave</button>
        </div>
      </div>
    </section>
  );
}
