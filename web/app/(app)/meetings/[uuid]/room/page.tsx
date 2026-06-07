"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LeaveIcon,
  LiveKitRoom,
  MicDisabledIcon,
  RoomAudioRenderer,
  TrackLoop,
  TrackToggle,
  VideoTrack,
  isTrackReference,
  type TrackReference,
  useParticipants,
  useRoomContext,
  useEnsureTrackRef,
  useIsMuted,
  useIsSpeaking,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { useAuth } from "@/components/AuthProvider";
import type { Meeting, Message, User } from "@/lib/spacetimedb-types/types";

function MeetingTopBar({ meeting, onEnd }: { meeting: Meeting; onEnd: () => void }) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    const update = () => {
      const startedAt = meeting.startedAt ? Number(meeting.startedAt) : Date.now();
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`);
    };
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [meeting.startedAt]);

  return (
    <div className="meeting-room-topbar">
      <div>
        <div style={{ fontWeight: 700 }}>{meeting.title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{elapsed} elapsed</div>
      </div>
      {meeting.agentEnabled !== false && (
        <div className="meeting-room-agent-pill"><span /> CC is listening</div>
      )}
    </div>
  );
}

function AgentTile() {
  return (
    <div className="meeting-agent-tile">
      <div className="meeting-agent-logo">CC</div>
      <div style={{ fontWeight: 700 }}>CC Assistant</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>Listening</div>
    </div>
  );
}

function MeetingParticipantTile() {
  const trackRef = useEnsureTrackRef();
  const participant = trackRef.participant;
  const participantName = participant.name || participant.identity;
  const isAgent = participant.identity.startsWith("agent-") || participant.name === "CC";
  const isSpeaking = useIsSpeaking(participant);
  const isTrackMuted = useIsMuted(trackRef);
  const isMicMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const hasVideoTrack = isTrackReference(trackRef) && trackRef.publication.kind === "video";
  const showVideo = hasVideoTrack && !isTrackMuted;

  if (isAgent) return <AgentTile />;

  return (
    <div className={`meeting-participant-tile ${isSpeaking ? "speaking" : ""} ${showVideo ? "" : "camera-off"} ${isScreenShare ? "screen-share" : ""}`}>
      {showVideo ? (
        <VideoTrack trackRef={trackRef as TrackReference} className="meeting-participant-video" />
      ) : (
        <div className="meeting-participant-fallback">
          <span>{isScreenShare ? `${participantName}'s screen` : participantName}</span>
        </div>
      )}
      {showVideo && (
        <div className="meeting-participant-name">
          {isScreenShare ? `${participantName}'s screen` : participantName}
        </div>
      )}
      {!isScreenShare && isMicMuted && (
        <div className="meeting-participant-muted" aria-label="Microphone muted">
          <MicDisabledIcon aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function VideoGrid() {
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const participants = useParticipants();
  const hasAgent = participants.some((participant) => participant.identity.startsWith("agent-") || participant.name === "CC");

  if (screenShareTracks.length > 0) {
    return (
      <div className="meeting-video-area">
        <div className="meeting-video-grid" data-count={1} style={{ display: "block", width: "100%", height: "100%" }}>
          <TrackLoop tracks={screenShareTracks}>
            <MeetingParticipantTile />
          </TrackLoop>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-video-area">
      <div className="meeting-video-grid" data-count={cameraTracks.length}>
        <TrackLoop tracks={cameraTracks}>
          <MeetingParticipantTile />
        </TrackLoop>
      </div>
      {meetingHasAgentTilePlaceholder(cameraTracks.length, hasAgent) && <AgentTile />}
    </div>
  );
}

function meetingHasAgentTilePlaceholder(trackCount: number, hasAgent: boolean) {
  return hasAgent && trackCount === 0;
}

function MeetingControls({ onLeave, onTogglePanel }: { onLeave: () => void, onTogglePanel: () => void }) {
  const room = useRoomContext();
  return (
    <div className="meeting-room-toolbar">
      <TrackToggle source={Track.Source.Microphone} className="meeting-control-btn" aria-label="Toggle microphone" title="Microphone" />
      <TrackToggle source={Track.Source.Camera} className="meeting-control-btn" aria-label="Toggle camera" title="Camera" />
      <TrackToggle source={Track.Source.ScreenShare} className="meeting-control-btn" aria-label="Share screen" title="Share screen" />
      <button type="button" className="meeting-control-btn" onClick={onTogglePanel} aria-label="Toggle chat" title="Toggle chat">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
      </button>
      <button type="button" className="meeting-control-btn danger" onClick={onLeave} aria-label="Leave meeting" title="Leave meeting">
        <LeaveIcon aria-hidden="true" />
      </button>
    </div>
  );
}

function MeetingRightPanel({
  meetingId,
  users,
  currentUser,
  messages,
  onSendMessage,
  isOpen,
  onClose,
}: {
  meetingId: bigint;
  users: Map<bigint, User>;
  currentUser: User;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"chat" | "participants">("chat");
  const participants = useParticipants();
  const room = useRoomContext();

  const handleSendMessage = (content: string) => {
    try {
      if (room && room.localParticipant) {
        const data = new TextEncoder().encode(JSON.stringify({ type: "chat", content }));
        room.localParticipant.publishData(data, { reliable: true });
      }
    } catch (e) {
      console.error("Error publishing data to room:", e);
    }
    onSendMessage(content);
  };

  return (
    <div className={`meeting-right-panel ${isOpen ? "open" : ""}`}>
      <div className="meeting-panel-tabs" style={{ display: "flex", alignItems: "center" }}>
        <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>Chat</button>
        <button className={tab === "participants" ? "active" : ""} onClick={() => setTab("participants")}>Participants</button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-muted)", padding: "0 16px", cursor: "pointer" }} aria-label="Close panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      {tab === "chat" ? (
        <>
          <MessageList messages={messages} users={users} currentUser={currentUser} emptyText="No meeting messages yet." />
          <div className="chat-footer">
            <MessageInput placeholder={`Message meeting #${meetingId.toString()}`} onSend={handleSendMessage} />
          </div>
        </>
      ) : (
        <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {participants.map((participant) => (
            <div key={participant.identity} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Avatar name={participant.name || participant.identity} size="sm" isAgent={participant.identity.startsWith("agent-") || participant.name === "CC"} />
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{participant.name || participant.identity}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                  {participant.identity.startsWith("agent-") || participant.name === "CC" ? "AI Assistant" : "Participant"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectedMeetingRoom({
  meeting,
  users,
  currentUser,
  messages,
  onSendMessage,
  onEnd,
}: {
  meeting: Meeting;
  users: Map<bigint, User>;
  currentUser: User;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onEnd: () => void;
}) {
  const [showPanel, setShowPanel] = useState(false);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const isScreenSharing = screenShareTracks.length > 0;

  return (
    <div className="meeting-room">
      <MeetingTopBar meeting={meeting} onEnd={onEnd} />
      <div className="meeting-room-main">
        <VideoGrid />
        <MeetingRightPanel 
          meetingId={meeting.id} 
          users={users} 
          currentUser={currentUser} 
          messages={messages} 
          onSendMessage={onSendMessage} 
          isOpen={showPanel && !isScreenSharing}
          onClose={() => setShowPanel(false)}
        />
      </div>
      <MeetingControls onLeave={onEnd} onTogglePanel={() => setShowPanel(p => !p)} />
      <RoomAudioRenderer />
    </div>
  );
}

export default function MeetingRoomPage(props: { params: Promise<{ uuid: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, db } = useAuth();
  const meetingUuid = params.uuid;
  const [meeting, setMeeting] = useState<Meeting | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const hasNavigatedAfterDisconnect = useRef(false);
  const [initialMicEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("cc_mic_enabled") !== "false";
  });
  const [initialCameraEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("cc_camera_enabled") !== "false";
  });

  useEffect(() => {
    if (!db || !user) return;
    const refresh = () => {
      const currentMeeting = Array.from(db.db.meeting.iter()).find((m: Meeting) => m.uuid === meetingUuid);
      setMeeting(currentMeeting && currentMeeting.companyId === user.companyId ? currentMeeting : undefined);
      
      const mId = currentMeeting?.id;
      if (mId !== undefined) {
        setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
        setMessages(
          Array.from(db.db.message.iter())
            .filter((message) => message.channelType === "MeetingThread" && message.channelId === mId)
            .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
        );
      }
    };
    refresh();
    db.db.meeting.onInsert(refresh);
    db.db.meeting.onUpdate(refresh);
    db.db.meeting.onDelete(refresh);
    db.db.message.onInsert(refresh);
    db.db.message.onUpdate(refresh);
    db.db.message.onDelete(refresh);
    db.db.user.onInsert(refresh);
    db.db.user.onUpdate(refresh);
    db.db.user.onDelete(refresh);
    return () => {
      db.db.meeting.removeOnInsert(refresh);
      db.db.meeting.removeOnUpdate(refresh);
      db.db.meeting.removeOnDelete(refresh);
      db.db.message.removeOnInsert(refresh);
      db.db.message.removeOnUpdate(refresh);
      db.db.message.removeOnDelete(refresh);
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
    };
  }, [db, meetingUuid, user]);

  useEffect(() => {
    if (!db || !meeting || !user) return;
    let cancelled = false;

    async function prepareRoom() {
      try {
        if (meeting?.status === "Scheduled") {
          await db?.reducers.startMeeting({ meetingId: meeting.id });
        }
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: meeting?.livekitRoomName,
            participantName: user?.displayName || user?.email,
            participantId: user?.id.toString(),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create token");
        if (!cancelled) setToken(data.token);
      } catch (error) {
        if (!cancelled) setTokenError(error instanceof Error ? error.message : "Unable to join LiveKit room");
      }
    }

    prepareRoom();
    return () => {
      cancelled = true;
    };
  }, [db, meeting, user]);

  const userMap = useMemo(() => new Map(users.map((teamUser) => [teamUser.id, teamUser])), [users]);

  async function sendMeetingMessage(content: string) {
    if (!db || !meeting) return;
    await db.reducers.sendMessage({ content, channelType: "MeetingThread", channelId: meeting.id });
  }

  async function leaveMeeting({ end }: { end: boolean }) {
    if (hasNavigatedAfterDisconnect.current) return;
    hasNavigatedAfterDisconnect.current = true;
    if (end && db && meeting?.status === "Active") {
      await db.reducers.endMeeting({ meetingId: meeting.id });
    }
    router.replace(`/dashboard`);
  }

  if (!user || !meeting) {
    return <div className="meeting-room-loading">Loading meeting...</div>;
  }

  if (tokenError) {
    return (
      <div className="meeting-room-loading">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1 style={{ marginBottom: 8 }}>LiveKit is not ready</h1>
          <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>{tokenError}</p>
          <Button variant="secondary" onClick={() => router.replace(`/dashboard`)}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  if (!token) {
    return <div className="meeting-room-loading"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect
      audio={initialMicEnabled}
      video={initialCameraEnabled}
      onDisconnected={() => leaveMeeting({ end: false })}
      onError={(error) => setTokenError(error.message)}
      style={{ height: "100vh" }}
    >
      <ConnectedMeetingRoom
        meeting={meeting}
        users={userMap}
        currentUser={user}
        messages={messages}
        onSendMessage={sendMeetingMessage}
        onEnd={() => leaveMeeting({ end: true })}
      />
    </LiveKitRoom>
  );
}
