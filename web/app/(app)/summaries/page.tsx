"use client";

import { useEffect, useMemo, useState } from "react";
import { SummaryCard } from "@/components/summaries/SummaryCard";
import { useAuth } from "@/components/AuthProvider";
import type { Meeting, MeetingParticipant, MeetingSummary, User } from "@/lib/spacetimedb-types/types";

type DateRange = "all" | "week" | "month";

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function inDateRange(summary: MeetingSummary, range: DateRange): boolean {
  if (range === "all") return true;
  const generatedAt = Number(summary.generatedAt);
  const days = range === "week" ? 7 : 30;
  return generatedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export default function SummariesPage() {
  const { user, db } = useAuth();
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  useEffect(() => {
    if (!db || !user) return;

    const refresh = () => {
      setSummaries(
        Array.from(db.db.meetingSummary.iter())
          .filter((summary) => summary.companyId === user.companyId)
          .sort((a, b) => Number(b.generatedAt) - Number(a.generatedAt))
      );
      setMeetings(Array.from(db.db.meeting.iter()).filter((meeting) => meeting.companyId === user.companyId));
      setParticipants(Array.from(db.db.meetingParticipant.iter()));
      setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
    };

    refresh();
    db.db.meetingSummary.onInsert(refresh);
    db.db.meetingSummary.onUpdate(refresh);
    db.db.meetingSummary.onDelete(refresh);
    db.db.meeting.onInsert(refresh);
    db.db.meeting.onUpdate(refresh);
    db.db.meeting.onDelete(refresh);
    db.db.meetingParticipant.onInsert(refresh);
    db.db.meetingParticipant.onUpdate(refresh);
    db.db.meetingParticipant.onDelete(refresh);
    db.db.user.onInsert(refresh);
    db.db.user.onUpdate(refresh);
    db.db.user.onDelete(refresh);

    return () => {
      db.db.meetingSummary.removeOnInsert(refresh);
      db.db.meetingSummary.removeOnUpdate(refresh);
      db.db.meetingSummary.removeOnDelete(refresh);
      db.db.meeting.removeOnInsert(refresh);
      db.db.meeting.removeOnUpdate(refresh);
      db.db.meeting.removeOnDelete(refresh);
      db.db.meetingParticipant.removeOnInsert(refresh);
      db.db.meetingParticipant.removeOnUpdate(refresh);
      db.db.meetingParticipant.removeOnDelete(refresh);
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
    };
  }, [db, user]);

  const meetingById = useMemo(() => new Map(meetings.map((meeting) => [meeting.id, meeting])), [meetings]);
  const userById = useMemo(() => new Map(users.map((teamUser) => [teamUser.id, teamUser])), [users]);

  const filteredSummaries = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return summaries.filter((summary) => {
      if (!inDateRange(summary, dateRange)) return false;
      if (!lower) return true;
      const meeting = meetingById.get(summary.meetingId);
      const decisions = parseStringArray(summary.keyDecisions).join(" ");
      return (
        summary.summaryText.toLowerCase().includes(lower) ||
        decisions.toLowerCase().includes(lower) ||
        meeting?.title.toLowerCase().includes(lower)
      );
    });
  }, [dateRange, meetingById, query, summaries]);

  function participantsFor(summary: MeetingSummary): User[] {
    const userIds = participants
      .filter((participant) => participant.meetingId === summary.meetingId)
      .map((participant) => participant.userId);
    return userIds.map((userId) => userById.get(userId)).filter(Boolean) as User[];
  }


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <h1 className="page-title" style={{ flex: 1 }}>Meeting Summaries</h1>

      </div>

      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-card)",
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className="input"
          placeholder="Search meetings, topics, decisions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ maxWidth: 520, flex: "1 1 320px" }}
        />
        <select className="input select" value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} style={{ width: 180 }}>
          <option value="all">All time</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </select>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {!summaries.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">CC</div>
            <h3 className="empty-state-title">No meeting summaries yet</h3>
            <p className="empty-state-text">Summaries appear here automatically after meetings end.</p>
          </div>
        ) : !filteredSummaries.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">?</div>
            <h3 className="empty-state-title">No summaries found for &quot;{query}&quot;</h3>
            <p className="empty-state-text">Try a different search or date range.</p>
          </div>
        ) : (
          filteredSummaries.map((summary) => (
            <SummaryCard
              key={summary.id.toString()}
              summary={summary}
              meeting={meetingById.get(summary.meetingId)}
              participants={participantsFor(summary)}
            />
          ))
        )}
      </div>
    </div>
  );
}
