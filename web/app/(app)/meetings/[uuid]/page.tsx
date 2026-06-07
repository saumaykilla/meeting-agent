"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { useAuth } from "@/components/AuthProvider";
import { CameraDisabledIcon, CameraIcon, MicDisabledIcon, MicIcon, ScreenShareIcon } from "@livekit/components-react";
import type { Meeting, MeetingParticipant, MeetingSummary, Message, User } from "@/lib/spacetimedb-types/types";
import { canJoinMeeting, formatMeetingDate, formatMeetingTime, meetingParticipants, meetingStartsIn, userName } from "@/lib/meeting-utils";

function useLiveElapsed(meeting?: Meeting) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!meeting?.startedAt) return "0:00";
  const elapsed = Math.max(0, Math.floor((now - Number(meeting.startedAt)) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MeetingLobbyPage(props: { params: Promise<{ uuid: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, db } = useAuth();
  const meetingUuid = params.uuid;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [meeting, setMeeting] = useState<Meeting | undefined>();
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | undefined>();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const timer = useLiveElapsed(meeting);

  useEffect(() => {
    if (!db || !user) return;
    const refresh = () => {
      const currentMeeting = Array.from(db.db.meeting.iter()).find((m: Meeting) => m.uuid === meetingUuid);
      setMeeting(currentMeeting && currentMeeting.companyId === user.companyId ? currentMeeting : undefined);
      const mId = currentMeeting?.id;
      if (mId !== undefined) {
        setParticipants(Array.from(db.db.meetingParticipant.iter()).filter((participant) => participant.meetingId === mId));
        setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
        setMessages(
          Array.from(db.db.message.iter())
            .filter((message) => message.channelType === "MeetingThread" && message.channelId === mId)
            .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
        );
        setSummary(Array.from(db.db.meetingSummary.iter()).find((item) => item.meetingId === mId && item.companyId === user.companyId));
      }
    };

    refresh();
    db.db.meeting.onInsert(refresh);
    db.db.meeting.onUpdate(refresh);
    db.db.meeting.onDelete(refresh);
    db.db.meetingParticipant.onInsert(refresh);
    db.db.meetingParticipant.onUpdate(refresh);
    db.db.meetingParticipant.onDelete(refresh);
    db.db.user.onInsert(refresh);
    db.db.user.onUpdate(refresh);
    db.db.user.onDelete(refresh);
    db.db.message.onInsert(refresh);
    db.db.message.onUpdate(refresh);
    db.db.message.onDelete(refresh);
    db.db.meetingSummary.onInsert(refresh);
    db.db.meetingSummary.onUpdate(refresh);
    db.db.meetingSummary.onDelete(refresh);

    return () => {
      db.db.meeting.removeOnInsert(refresh);
      db.db.meeting.removeOnUpdate(refresh);
      db.db.meeting.removeOnDelete(refresh);
      db.db.meetingParticipant.removeOnInsert(refresh);
      db.db.meetingParticipant.removeOnUpdate(refresh);
      db.db.meetingParticipant.removeOnDelete(refresh);
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
      db.db.message.removeOnInsert(refresh);
      db.db.message.removeOnUpdate(refresh);
      db.db.message.removeOnDelete(refresh);
      db.db.meetingSummary.removeOnInsert(refresh);
      db.db.meetingSummary.removeOnUpdate(refresh);
      db.db.meetingSummary.removeOnDelete(refresh);
    };
  }, [db, meetingUuid, user]);

  useEffect(() => {
    const savedMic = localStorage.getItem("cc_mic_enabled");
    const savedCamera = localStorage.getItem("cc_camera_enabled");
    // Media preferences are restored once from browser storage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedMic) setMicEnabled(savedMic === "true");
    if (savedCamera) setCameraEnabled(savedCamera === "true");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cameraEnabled) {
      stream?.getTracks().forEach((track) => track.stop());
      // Keep preview state in sync when the user disables their camera.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStream(null);
      return;
    }
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: micEnabled })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch(() => setStream(null));

    return () => {
      cancelled = true;
    };
    // stream is intentionally omitted so replacing the preview stream does not re-request media.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled, micEnabled]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
    localStorage.setItem("cc_mic_enabled", String(micEnabled));
    localStorage.setItem("cc_camera_enabled", String(cameraEnabled));
  }, [cameraEnabled, micEnabled, stream]);

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const participantUsers = useMemo(() => meeting ? meetingParticipants(meeting.id, participants, users) : [], [meeting, participants, users]);
  const host = users.find((teamUser) => teamUser.id === meeting?.createdBy);
  const userMap = useMemo(() => new Map(users.map((teamUser) => [teamUser.id, teamUser])), [users]);

  async function startMeeting() {
    if (!db || !meeting) return;
    if (meeting.status === "Scheduled") {
      await db.reducers.startMeeting({ meetingId: meeting.id });
    }
    router.push(`/meetings/${meetingUuid}/room`);
  }

  async function sendThreadMessage(content: string) {
    if (!db || !meeting) return;
    await db.reducers.sendMessage({ content, channelType: "MeetingThread", channelId: meeting.id });
  }

  if (!meeting || !user) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📅</div>
        <h3 className="empty-state-title">Meeting not found</h3>
        <Link href="/meetings"><Button variant="secondary">Back to meetings</Button></Link>
      </div>
    );
  }

  const joinEnabled = canJoinMeeting(meeting);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/meetings")}>← Meetings</button>
        <h1 className="page-title" style={{ flex: 1 }}>{meeting.title}</h1>
        <MeetingStatusBadge status={meeting.status as "Scheduled" | "Active" | "Ended"} />
      </div>

      <div className="responsive-grid-sidebar page-content">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="card card-accent">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>{meeting.title}</h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                  {formatMeetingDate(meeting.scheduledAt)} · {formatMeetingTime(meeting.scheduledAt)} · Host: {userName(host)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", fontVariantNumeric: "tabular-nums" }}>
                  {meeting.status === "Active" ? timer : meeting.status === "Scheduled" ? meetingStartsIn(meeting) : "Ended"}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                  {meeting.status === "Active" ? "elapsed" : "status"}
                </div>
              </div>
            </div>

            <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#111", aspectRatio: "16 / 9", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {stream && cameraEnabled ? (
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ color: "white", textAlign: "center" }}>
                  <Avatar name={user.displayName || user.email} size="lg" />
                  <p style={{ marginTop: 12 }}>Camera preview off</p>
                </div>
              )}

              <div className="meeting-lobby-controls" style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 24, backdropFilter: "blur(8px)" }}>
                <button
                  type="button"
                  className={`meeting-media-btn ${micEnabled ? "" : "off"}`}
                  onClick={() => setMicEnabled((value) => !value)}
                  aria-label={micEnabled ? "Turn microphone off" : "Turn microphone on"}
                  title={micEnabled ? "Microphone on" : "Microphone off"}
                >
                  {micEnabled ? <MicIcon /> : <MicDisabledIcon />}
                </button>
                <button
                  type="button"
                  className={`meeting-media-btn ${cameraEnabled ? "" : "off"}`}
                  onClick={() => setCameraEnabled((value) => !value)}
                  aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  title={cameraEnabled ? "Camera on" : "Camera off"}
                >
                  {cameraEnabled ? <CameraIcon /> : <CameraDisabledIcon />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Participants
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {participantUsers.map((participant) => (
                  <div key={participant.id.toString()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", background: "var(--color-surface)", borderRadius: "var(--radius-full)", fontSize: "var(--text-sm)" }}>
                    <Avatar name={participant.displayName || participant.email} size="sm" />
                    {participant.displayName || participant.email}
                  </div>
                ))}
              </div>
            </div>

            {meeting.status === "Ended" ? (
              summary ? (
                <Link href={`/summaries/${summary.id.toString()}`}>
                  <Button variant="secondary" size="lg" style={{ width: "100%" }}>View summary</Button>
                </Link>
              ) : (
                <Link href="/summaries"><Button variant="secondary" size="lg" style={{ width: "100%" }}>Summary generating...</Button></Link>
              )
            ) : (
              <Button variant="accent" size="lg" style={{ width: "100%" }} disabled={!joinEnabled} onClick={startMeeting}>
                {meeting.status === "Active" ? "Join Meeting" : joinEnabled ? "Start Meeting" : "Join opens 5 minutes before start"}
              </Button>
            )}
          </div>

          {meeting.agentEnabled !== false && (
            <div className="card-agent" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Avatar name="CC" isAgent size="md" />
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-agent-text)", marginBottom: 2 }}>
                  CC Assistant will join automatically
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                  CC listens, flags repeated topics, and generates a summary when the meeting ends. Say “@CC” to ask a question.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="card card-sm" style={{ height: 620, padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)", fontWeight: "var(--font-semibold)" }}>
            Meeting thread
          </div>
          <MessageList messages={messages} users={userMap} currentUser={user} emptyText="No meeting thread messages yet." />
          <div className="chat-footer">
            <MessageInput placeholder="Message meeting thread" onSend={sendThreadMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
