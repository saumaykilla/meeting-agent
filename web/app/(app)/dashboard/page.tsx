"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";
import type { Meeting, MeetingParticipant, MeetingSummary, Message, User } from "@/lib/spacetimedb-types/types";
import { formatMeetingDate, formatMeetingTime, meetingParticipants } from "@/lib/meeting-utils";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, db } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const refresh = () => {
      setMeetings(Array.from(db.db.meeting.iter()).filter((meeting) => meeting.companyId === user.companyId));
      setParticipants(Array.from(db.db.meetingParticipant.iter()));
      setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
      setSummaries(Array.from(db.db.meetingSummary.iter()).filter((summary) => summary.companyId === user.companyId));
      setMessages(Array.from(db.db.message.iter()).filter((message) => message.companyId === user.companyId));
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
      db.db.meetingParticipant.removeOnInsert(refresh);
      db.db.meetingParticipant.removeOnUpdate(refresh);
      db.db.meetingParticipant.removeOnDelete(refresh);
      db.db.meetingSummary.removeOnInsert(refresh);
      db.db.meetingSummary.removeOnUpdate(refresh);
      db.db.meetingSummary.removeOnDelete(refresh);
      db.db.message.removeOnInsert(refresh);
      db.db.message.removeOnUpdate(refresh);
      db.db.message.removeOnDelete(refresh);
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
    };
  }, [db, user]);

  const todayMeetings = useMemo(() => {
    const today = new Date().toDateString();
    return meetings
      .filter((meeting) => new Date(Number(meeting.scheduledAt)).toDateString() === today && meeting.status !== "Ended")
      .sort((a, b) => Number(a.scheduledAt) - Number(b.scheduledAt));
  }, [meetings]);

  const recentSummaries = useMemo(
    () => summaries.sort((a, b) => Number(b.generatedAt) - Number(a.generatedAt)).slice(0, 3),
    [summaries]
  );

  const recentActivity = useMemo(
    () =>
      messages
        .sort((a, b) => Number(b.sentAt) - Number(a.sentAt))
        .slice(0, 5)
        .map((message) => {
          const sender = users.find((teamUser) => teamUser.id === message.senderId);
          return {
            id: message.id.toString(),
            text: message.isAgentMessage
              ? "CC Assistant posted an update"
              : `${sender?.displayName || sender?.email || "Someone"} posted a message`,
            agent: message.isAgentMessage,
            time: new Date(Number(message.sentAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }),
    [messages, users]
  );

  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{greeting()}, {user.displayName || user.email} 👋</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginTop: 2 }}>
            {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Link href="/meetings/new"><Button variant="primary">Schedule Meeting</Button></Link>
      </div>

      <div className="responsive-grid-sidebar page-content">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <section>
            <div className="section-header">
              <h2 className="section-title">Today&apos;s Meetings</h2>
              <Link href="/meetings" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {todayMeetings.length === 0 ? (
                <div className="card card-sm" style={{ color: "var(--color-muted)" }}>No meetings today.</div>
              ) : (
                todayMeetings.map((meeting) => {
                  const meetingUsers = meetingParticipants(meeting.id, participants, users);
                  return (
                    <div key={meeting.id.toString()} className="card card-sm">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 6 }}>
                            <span style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>{meeting.title}</span>
                            <MeetingStatusBadge status={meeting.status as "Scheduled" | "Active" | "Ended"} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>{formatMeetingTime(meeting.scheduledAt)}</span>
                            <div style={{ display: "flex" }}>
                              {meetingUsers.slice(0, 4).map((participant, index) => (
                                <div key={participant.id.toString()} style={{ marginLeft: index > 0 ? -6 : 0 }}>
                                  <Avatar name={participant.displayName || participant.email} size="sm" />
                                </div>
                              ))}
                            </div>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{meetingUsers.length} participants</span>
                          </div>
                        </div>
                        <Link href={meeting.status === "Active" ? `/meetings/${meeting.uuid}/room` : `/meetings/${meeting.uuid}`}>
                          <Button variant={meeting.status === "Active" ? "accent" : "secondary"} size="sm">
                            {meeting.status === "Active" ? "Join Now" : "View"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <div className="section-header">
              <h2 className="section-title">Recent Summaries</h2>
              <Link href="/summaries" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {recentSummaries.length === 0 ? (
                <div className="card card-sm" style={{ color: "var(--color-muted)" }}>No summaries yet.</div>
              ) : (
                recentSummaries.map((summary) => (
                  <Link key={summary.id.toString()} href={`/summaries/${summary.id.toString()}`} style={{ display: "block" }}>
                    <div className="card card-accent card-sm" style={{ cursor: "pointer", transition: "box-shadow var(--transition-fast)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)" }}>Meeting #{summary.meetingId.toString()}</span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{formatMeetingDate(summary.generatedAt)}</span>
                      </div>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {summary.summaryText}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="card-agent">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 10 }}>
              <Avatar name="CC" isAgent size="sm" />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-agent-text)" }}>CC Assistant Memory</span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: 1.55, marginBottom: 12 }}>
              CC has indexed <strong style={{ color: "var(--color-primary)" }}>{summaries.filter((summary) => summary.pineconeIndexed).length} meetings</strong>{" "}
              in your company&apos;s knowledge base.
            </p>
            <Link href="/summaries" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>Browse all summaries →</Link>
          </div>

          <div className="card card-sm">
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: 12 }}>Team Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {recentActivity.length === 0 ? (
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>No activity yet.</p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
                    <p style={{ fontSize: "var(--text-sm)", color: item.agent ? "var(--color-agent-text)" : "var(--color-primary)", lineHeight: 1.4, flex: 1 }}>
                      {item.agent && <span style={{ fontWeight: "var(--font-semibold)" }}>◉ </span>}
                      {item.text}
                    </p>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
