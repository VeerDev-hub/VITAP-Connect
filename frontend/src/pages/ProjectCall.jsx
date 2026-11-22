import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LoaderCircle, Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, ScreenShareOff, TriangleAlert, Users, Video, VideoOff } from "lucide-react";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const fallbackIceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

// The call screen is always dark, independent of the app theme.
function VideoTile({ title, stream, muted = false, isVideoEnabled = true, isAudioEnabled = true, local = false, sharingScreen = false, focused = false, onPin }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream, isVideoEnabled]);

  return (
    <button
      type="button"
      onClick={onPin}
      className={`group relative h-full w-full overflow-hidden rounded-lg bg-[#1E1C19] text-left ${focused ? "" : "ring-1 ring-white/10 hover:ring-white/30"}`}
    >
      {stream && isVideoEnabled ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || local} className={`h-full w-full bg-black ${sharingScreen ? "object-contain" : "object-cover"} ${local && !sharingScreen ? "-scale-x-100" : ""}`} />
      ) : (
        <>
          {stream && <video ref={videoRef} autoPlay playsInline muted={muted || local} className="hidden" />}
          <div className="flex h-full items-center justify-center">
            <span className={`flex items-center justify-center rounded-lg bg-white/10 font-display font-semibold text-white ${focused ? "h-24 w-24 text-4xl" : "h-12 w-12 text-lg"}`}>
              {title?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6 text-white">
        <span className="truncate text-sm font-medium">{title}</span>
        {!isAudioEnabled && <MicOff size={14} className="shrink-0 text-[#F4786A]" aria-label="Muted" />}
        {sharingScreen && <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">screen</span>}
      </div>
    </button>
  );
}

function ControlButton({ active = true, danger = false, onClick, disabled, label, children }) {
  const tone = danger
    ? "bg-[#D9480F] text-white hover:bg-[#C23F0D]"
    : active
    ? "bg-white/10 text-white hover:bg-white/20"
    : "bg-white text-[#17160F] hover:bg-white/90";
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${tone}`}>
      {children}
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
  const stageRef = useRef(null);

  const type = searchParams.get("type") || "video";
  const project = searchParams.get("project") || "Project room";
  const peerName = searchParams.get("peerName") || "Teammate";
  const isPrivateCall = searchParams.get("private") === "1";
  const isVoiceRoom = type === "voice";

  const stageItems = [
    {
      id: "local",
      title: `${user.name} (you)`,
      stream: screenStreamRef.current || localStreamRef.current,
      isAudioEnabled: isMicEnabled,
      isVideoEnabled: isSharingScreen || isCameraEnabled,
      sharingScreen: isSharingScreen,
      local: true
    },
    ...remoteParticipants.map((p) => ({
      id: p.socketId,
      title: p.userName,
      stream: p.stream,
      isAudioEnabled: p.audioEnabled,
      isVideoEnabled: p.videoEnabled,
      sharingScreen: p.sharingScreen,
      local: false
    }))
  ];
  const pinnedItem = stageItems.find((i) => i.id === pinnedTileId) || stageItems.find((i) => i.sharingScreen) || stageItems[0];
  const thumbnailItems = stageItems.filter((i) => i.id !== pinnedItem?.id);

  useEffect(() => {
    // Prioritise screen sharers, then a remote participant over the local tile.
    const sharer = stageItems.find((i) => i.sharingScreen && i.id !== pinnedTileId);
    if (sharer) return setPinnedTileId(sharer.id);
    if (pinnedTileId === "local" && remoteParticipants.length > 0) setPinnedTileId(remoteParticipants[0].socketId);
  }, [remoteParticipants.length, isSharingScreen, pinnedTileId]);

  function upsertRemoteParticipant(participant, patch = {}) {
    setRemoteParticipants((current) => {
      const existing = current.find((i) => i.socketId === participant.socketId);
      return existing
        ? current.map((i) => (i.socketId === participant.socketId ? { ...i, ...participant, ...patch } : i))
        : [...current, { ...participant, ...patch, stream: patch.stream || null }];
    });
  }

  function removeRemoteParticipant(socketId) {
    setRemoteParticipants((current) => current.filter((p) => p.socketId !== socketId));
    setPinnedTileId((current) => (current === socketId ? "local" : current));
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
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
    if (localVideoRef.current) localVideoRef.current.srcObject = stream || null;
  }

  async function fetchCallConfig() {
    try {
      const { data } = await api.get("/config/call");
      if (Array.isArray(data.iceServers) && data.iceServers.length) iceServersRef.current = data.iceServers;
    } catch {
      iceServersRef.current = fallbackIceServers;
    }
  }

  async function getLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    const constraints = isVoiceRoom
      ? { audio: true, video: false }
      : { audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      attachLocalPreview(stream);
      setIsMicEnabled(stream.getAudioTracks().every((t) => t.enabled));
      setIsCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks().every((t) => t.enabled));
      return stream;
    } catch (primaryError) {
      if (!isVoiceRoom) {
        const fallback = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = fallback;
        attachLocalPreview(fallback);
        setIsMicEnabled(true);
        setIsCameraEnabled(false);
        setError("Camera unavailable — you joined with audio only.");
        return fallback;
      }
      throw primaryError;
    }
  }

  async function replaceOutgoingVideoTrack(nextTrack) {
    const replacements = [];
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) replacements.push(sender.replaceTrack(nextTrack || null));
    });
    await Promise.all(replacements);
  }

  async function stopScreenShare() {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    attachLocalPreview(localStreamRef.current);
    await replaceOutgoingVideoTrack(localStreamRef.current?.getVideoTracks()?.[0] || null);
  }

  async function createPeerConnection(participant, shouldCreateOffer) {
    if (!participant?.socketId || participant.socketId === socket.id) return peerConnectionsRef.current.get(participant.socketId);
    if (peerConnectionsRef.current.has(participant.socketId)) return peerConnectionsRef.current.get(participant.socketId);

    const stream = await getLocalStream();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerConnectionsRef.current.set(participant.socketId, pc);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => upsertRemoteParticipant(participant, { stream: event.streams[0] });
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit("call:signal", { roomId, targetSocketId: participant.socketId, payload: { type: "ice-candidate", candidate: event.candidate } });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        closePeerConnection(participant.socketId);
        removeRemoteParticipant(participant.socketId);
      }
    };

    if (shouldCreateOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:signal", { roomId, targetSocketId: participant.socketId, payload: { type: "offer", sdp: offer } });
    }
    return pc;
  }

  async function handleSignalMessage({ fromSocketId, fromUserId, fromUserName, payload }) {
    if (!payload?.type || !fromSocketId) return;
    const participant = { socketId: fromSocketId, userId: fromUserId, userName: fromUserName, audioEnabled: true, videoEnabled: true, sharingScreen: false };
    upsertRemoteParticipant(participant);
    const pc = await createPeerConnection(participant, false);

    if (payload.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:signal", { roomId, targetSocketId: fromSocketId, payload: { type: "answer", sdp: answer } });
    } else if (payload.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    } else if (payload.type === "ice-candidate" && payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        /* late or duplicate candidate */
      }
    }
  }

  useEffect(() => {
    let active = true;
    async function joinRoom() {
      try {
        await fetchCallConfig();
        await getLocalStream();
        if (!socket.connected) socket.connect();

        const onParticipants = async ({ participants }) => {
          if (!active) return;
          setRemoteParticipants(participants.map((p) => ({ ...p, stream: null })));
          for (const p of participants) await createPeerConnection(p, true);
        };
        const onJoined = ({ participant }) => {
          if (!active || !participant || participant.socketId === socket.id) return;
          upsertRemoteParticipant(participant);
        };
        const onLeft = ({ socketId }) => {
          closePeerConnection(socketId);
          removeRemoteParticipant(socketId);
        };
        const onMediaState = ({ participant }) => participant?.socketId && upsertRemoteParticipant(participant);
        const onSignal = (message) => {
          handleSignalMessage(message).catch(() => setError("Couldn't connect to a participant. Try leaving and rejoining."));
        };

        socket.on("call:participants", onParticipants);
        socket.on("call:participant-joined", onJoined);
        socket.on("call:participant-left", onLeft);
        socket.on("call:media-state", onMediaState);
        socket.on("call:signal", onSignal);
        cleanupHandlersRef.current = () => {
          socket.off("call:participants", onParticipants);
          socket.off("call:participant-joined", onJoined);
          socket.off("call:participant-left", onLeft);
          socket.off("call:media-state", onMediaState);
          socket.off("call:signal", onSignal);
        };

        if (!joinedRef.current) {
          socket.emit("call:join", { roomId, userName: user.name, callType: type, audioEnabled: true, videoEnabled: !isVoiceRoom && isCameraEnabled, sharingScreen: false });
          joinedRef.current = true;
        }
        setLoading(false);
      } catch (callError) {
        setError(callError?.message || "We couldn't access your microphone or camera.");
        setLoading(false);
      }
    }

    joinRoom();

    return () => {
      active = false;
      cleanupHandlersRef.current();
      socket.emit("call:leave", { roomId });
      joinedRef.current = false;
      peerConnectionsRef.current.forEach((_, id) => closePeerConnection(id));
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [roomId, socket, type, user.name]);

  useEffect(() => {
    attachLocalPreview(screenStreamRef.current || localStreamRef.current);
  }, [loading, isSharingScreen]);

  function updateMediaState(state) {
    socket.emit("call:media-state", { roomId, ...state });
  }

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMicEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setIsMicEnabled(next);
    updateMediaState({ audioEnabled: next, videoEnabled: isCameraEnabled || isSharingScreen, sharingScreen: isSharingScreen });
  }

  function toggleCamera() {
    if (isVoiceRoom || isSharingScreen) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCameraEnabled;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
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
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = display.getVideoTracks()[0];
      screenStreamRef.current = display;
      setIsSharingScreen(true);
      attachLocalPreview(display);
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

  const heading = isPrivateCall ? `Call with ${peerName}` : project;

  return (
    <div className="flex h-dvh flex-col bg-[#0E0D0C] text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <span className={`h-2 w-2 rounded-full ${loading ? "bg-white/40" : "bg-[#68C48D]"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{heading}</p>
          <p className="truncate font-mono text-[10px] text-white/50">{isVoiceRoom ? "voice" : "video"} · {roomId.slice(0, 8)}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2 py-1 font-mono text-xs"><Users size={13} /> {remoteParticipants.length + 1}</span>
        <button type="button" onClick={toggleFullscreen} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white" aria-label={isFullscreen ? "Exit full screen" : "Full screen"}>
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-2 border-b border-[#E7B354]/30 bg-[#E7B354]/10 px-4 py-2 text-sm text-[#F2D9A6]">
          <TriangleAlert size={15} /> {error}
        </div>
      )}

      <div ref={stageRef} className="flex min-h-0 flex-1 flex-col gap-3 bg-[#0E0D0C] p-3 sm:p-4">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/70">
            <LoaderCircle className="animate-spin" size={28} />
            <p className="text-sm">Joining the room…</p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1">
              {pinnedItem && (
                <VideoTile
                  title={pinnedItem.title}
                  stream={pinnedItem.stream}
                  isAudioEnabled={pinnedItem.isAudioEnabled}
                  isVideoEnabled={pinnedItem.isVideoEnabled}
                  sharingScreen={pinnedItem.sharingScreen}
                  local={pinnedItem.local}
                  muted={pinnedItem.local}
                  focused
                  onPin={() => setPinnedTileId(pinnedItem.id)}
                />
              )}
            </div>
            {thumbnailItems.length > 0 && (
              <div className="flex h-28 shrink-0 gap-3 overflow-x-auto sm:h-32">
                {thumbnailItems.map((item) => (
                  <div key={item.id} className="aspect-video h-full shrink-0">
                    <VideoTile
                      title={item.title}
                      stream={item.stream}
                      isAudioEnabled={item.isAudioEnabled}
                      isVideoEnabled={item.isVideoEnabled}
                      sharingScreen={item.sharingScreen}
                      local={item.local}
                      muted={item.local}
                      onPin={() => setPinnedTileId(item.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            {remoteParticipants.length === 0 && (
              <p className="text-center text-sm text-white/50">Waiting for others to join…</p>
            )}
          </>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ControlButton active={isMicEnabled} onClick={toggleMic} label={isMicEnabled ? "Mute" : "Unmute"}>
          {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </ControlButton>
        {!isVoiceRoom && (
          <ControlButton active={isCameraEnabled} onClick={toggleCamera} disabled={isSharingScreen} label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}>
            {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </ControlButton>
        )}
        {!isVoiceRoom && (
          <ControlButton active={!isSharingScreen} onClick={toggleScreenShare} label={isSharingScreen ? "Stop sharing" : "Share screen"}>
            {isSharingScreen ? <ScreenShareOff size={18} /> : <MonitorUp size={18} />}
            <span className="hidden sm:inline">{isSharingScreen ? "Stop" : "Share"}</span>
          </ControlButton>
        )}
        <ControlButton danger onClick={leaveRoom} label="Leave call">
          <PhoneOff size={18} /> <span className="hidden sm:inline">Leave</span>
        </ControlButton>
      </footer>
    </div>
  );
}
