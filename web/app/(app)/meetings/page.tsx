"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { AvatarGroup } from "@/components/ui/Avatar";
import { MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Meeting, MeetingParticipant, MeetingSummary, User } from "@/lib/spacetimedb-types/types";
import {
  formatMeetingTime,
  latestSummaryForMeeting,
  meetingParticipants,
} from "@/lib/meeting-utils";

type Tab = "upcoming" | "past" | "mine";

function MeetingCard({
  meeting,
  participants,
  summary,
  onCancel,
}: {
  meeting: Meeting;
  participants: User[];
  summary?: MeetingSummary;
  onCancel: (meeting: Meeting) => void;
}) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
      <div
        style={{
          width: 52,
          textAlign: "center",
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          paddingRight: "var(--space-4)",
        }}
      >
        <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)", color: "var(--color-muted)", textTransform: "uppercase" }}>
          {new Date(Number(meeting.scheduledAt)).toLocaleDateString([], { month: "short" })}
        </div>
        <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", lineHeight: 1.2 }}>
          {new Date(Number(meeting.scheduledAt)).getDate()}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>
            {meeting.title}
          </h3>
          <MeetingStatusBadge status={meeting.status as "Scheduled" | "Active" | "Ended"} />
          {meeting.agentEnabled !== false && <span className="badge badge-agent">CC</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
          <span>{formatMeetingTime(meeting.scheduledAt)}</span>
          <AvatarGroup users={participants.map((p) => ({ id: Number(p.id), name: p.displayName || p.email }))} size="sm" max={4} />
          <span>{participants.length} participants</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
        {meeting.status === "Active" && (
          <Link href={`/meetings/${meeting.id.toString()}/room`}>
            <Button variant="accent" size="sm">Join Now</Button>
          </Link>
        )}
        {meeting.status === "Scheduled" && (
          <>
            <Link href={`/meetings/${meeting.id.toString()}`}>
              <Button variant="secondary" size="sm">View</Button>
            </Link>
            <Button variant="danger" size="sm" onClick={() => onCancel(meeting)}>
              Cancel
            </Button>
          </>
        )}
        {meeting.status === "Ended" && summary && (
          <Link href={`/summaries/${summary.id.toString()}`}>
            <Button variant="secondary" size="sm">Summary</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { user, db } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const refresh = () => {
      setMeetings(
        Array.from(db.db.meeting.iter())
          .filter((meeting) => meeting.companyId === user.companyId)
          .sort((a, b) => Number(a.scheduledAt) - Number(b.scheduledAt))
      );
      setParticipants(Array.from(db.db.meetingParticipant.iter()));
      setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
      setSummaries(Array.from(db.db.meetingSummary.iter()).filter((summary) => summary.companyId === user.companyId));
    };

    refresh();
    db.db.meeting.onInsert(refresh);
    db.db.meeting.onUpdate(refresh);
    db.db.meeting.onDelete(refresh);
    db.db.meetingParticipant.onInsert(refresh);
    db.db.meetingParticipant.onUpdate(refresh);
    db.db.meetingParticipant.onDelete(refresh);
    db.db.meetingSummary.onInsert(refresh);
    db.db.meetingSummary.onUpdate(refresh);
    db.db.meetingSummary.onDelete(refresh);
    db.db.user.onInsert(refresh);
    db.db.user.onUpdate(refresh);
    db.db.user.onDelete(refresh);

    return () => {
      db.db.meeting.removeOnInsert(refresh);
      db.db.meeting.removeOnUpdate(refresh);
      db.db.meeting.removeOnDelete(refresh);
      db.db.meetingParticipant.removeOnInsert(refresh);
      db.db.meetingParticipant.removeOnUpdate(refresh);
      db.db.meetingParticipant.removeOnDelete(refresh);
      db.db.meetingSummary.removeOnInsert(refresh);
      db.db.meetingSummary.removeOnUpdate(refresh);
      db.db.meetingSummary.removeOnDelete(refresh);
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
    };
  }, [db, user]);

  const displayed = useMemo(() => {
    if (!user) return [];
    if (activeTab === "past") return meetings.filter((meeting) => meeting.status === "Ended");
    if (activeTab === "mine") {
      const myMeetingIds = new Set(
        participants
          .filter((participant) => participant.userId === user.id)
          .map((participant) => participant.meetingId)
      );
      return meetings.filter((meeting) => myMeetingIds.has(meeting.id));
    }
    return meetings.filter((meeting) => meeting.status === "Scheduled" || meeting.status === "Active");
  }, [activeTab, meetings, participants, user]);

  async function cancelMeeting(meeting: Meeting) {
    if (!db) return;
    if (!window.confirm(`Cancel "${meeting.title}"?`)) return;
    await db.reducers.cancelMeeting({ meetingId: meeting.id });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <h1 className="page-title" style={{ flex: 1 }}>Meetings</h1>
        <Link href="/meetings/new">
          <Button variant="primary">Schedule Meeting</Button>
        </Link>
      </div>

      <div style={{ padding: "0 var(--space-6)", borderBottom: "1px solid var(--color-border)", background: "var(--color-card)", display: "flex", gap: "var(--space-1)" }}>
        {(["upcoming", "past", "mine"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 16px",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              color: activeTab === tab ? "var(--color-primary)" : "var(--color-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              textTransform: "capitalize",
            }}
          >
            {tab === "upcoming" ? "Upcoming" : tab === "past" ? "Past" : "My Meetings"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">No meetings here</h3>
            <p className="empty-state-body">
              {activeTab === "upcoming" ? "No upcoming meetings. Schedule one to get started." : "No meetings found."}
            </p>
            {activeTab === "upcoming" && (
              <Link href="/meetings/new" style={{ marginTop: 8 }}>
                <Button variant="primary">Schedule Meeting</Button>
              </Link>
            )}
          </div>
        ) : (
          displayed.map((meeting) => (
            <MeetingCard
              key={meeting.id.toString()}
              meeting={meeting}
              participants={meetingParticipants(meeting.id, participants, users)}
              summary={latestSummaryForMeeting(meeting.id, summaries)}
              onCancel={cancelMeeting}
            />
          ))
        )}
      </div>
    </div>
  );
}
