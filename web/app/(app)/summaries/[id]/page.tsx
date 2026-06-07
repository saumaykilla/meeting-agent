"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvatarGroup } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ActionItemsTable, type ActionItem } from "@/components/summaries/ActionItemsTable";
import { RecallAlert } from "@/components/summaries/RecallAlert";
import { useAuth } from "@/components/AuthProvider";
import type { Meeting, MeetingParticipant, MeetingSummary, Message, User } from "@/lib/spacetimedb-types/types";

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseActionItems(value: string): ActionItem[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return { item };
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const text = record.item || record.task || record.description;
        if (!text) return null;
        return {
          item: String(text),
          owner: record.owner ? String(record.owner) : null,
          dueDate: record.dueDate ? String(record.dueDate) : null,
          due_date: record.due_date ? String(record.due_date) : null,
        };
      })
      .filter(Boolean) as ActionItem[];
  } catch {
    return [];
  }
}

function formatDate(value?: bigint): string {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Number(value)));
}

function formatTime(value?: bigint): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Number(value)));
}

function durationMinutes(meeting?: Meeting): number | null {
  if (!meeting?.startedAt || !meeting.endedAt) return null;
  return Math.max(1, Math.round((Number(meeting.endedAt) - Number(meeting.startedAt)) / 60000));
}

function recallMessage(messages: Message[]): string | null {
  const match = messages.find((message) => {
    if (!message.isAgentMessage) return false;
    const lower = message.content.toLowerCase();
    return lower.includes("past discussion") || lower.includes("repeated topic") || lower.includes("previous meeting");
  });
  return match?.content || null;
}

export default function SummaryDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, db } = useAuth();
  const summaryId = BigInt(params.id);
  const [summary, setSummary] = useState<MeetingSummary | undefined>();
  const [meeting, setMeeting] = useState<Meeting | undefined>();
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allSummaries, setAllSummaries] = useState<MeetingSummary[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const refresh = () => {
      const currentSummary = db.db.meetingSummary.id.find(summaryId);
      if (!currentSummary || currentSummary.companyId !== user.companyId) {
        setSummary(undefined);
        return;
      }
      setSummary(currentSummary);
      setMeeting(db.db.meeting.id.find(currentSummary.meetingId) || undefined);
      setParticipants(Array.from(db.db.meetingParticipant.iter()).filter((participant) => participant.meetingId === currentSummary.meetingId));
      setUsers(Array.from(db.db.user.iter()).filter((teamUser) => teamUser.companyId === user.companyId));
      setMessages(
        Array.from(db.db.message.iter())
          .filter((message) => message.channelType === "MeetingThread" && message.channelId === currentSummary.meetingId)
          .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
      );
      setAllSummaries(
        Array.from(db.db.meetingSummary.iter())
          .filter((item) => item.companyId === user.companyId)
          .sort((a, b) => Number(b.generatedAt) - Number(a.generatedAt))
      );
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
    db.db.message.onInsert(refresh);
    db.db.message.onUpdate(refresh);
    db.db.message.onDelete(refresh);

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
      db.db.message.removeOnInsert(refresh);
      db.db.message.removeOnUpdate(refresh);
      db.db.message.removeOnDelete(refresh);
    };
  }, [db, summaryId, user]);

  const participantUsers = useMemo(() => {
    const userById = new Map(users.map((teamUser) => [teamUser.id, teamUser]));
    return participants.map((participant) => userById.get(participant.userId)).filter(Boolean) as User[];
  }, [participants, users]);

  const decisions = useMemo(() => parseStringArray(summary?.keyDecisions || "[]"), [summary]);
  const actionItems = useMemo(() => parseActionItems(summary?.actionItems || "[]"), [summary]);
  const recall = useMemo(() => recallMessage(messages), [messages]);

  const currentIndex = allSummaries.findIndex((item) => item.id === summaryId);
  const previousSummary = currentIndex >= 0 ? allSummaries[currentIndex + 1] : undefined;
  const nextSummary = currentIndex > 0 ? allSummaries[currentIndex - 1] : undefined;
  const duration = durationMinutes(meeting);

  if (!summary || !user) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">?</div>
        <h3 className="empty-state-title">Summary not found</h3>
        <Link href="/summaries"><Button variant="secondary">Back to summaries</Button></Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/summaries")}>Back to summaries</button>
        <h1 className="page-title" style={{ flex: 1 }}>{meeting?.title || "Meeting Summary"}</h1>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 820, width: "100%", margin: "0 auto" }}>
        <section className="card card-accent">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>
                {meeting?.title || "Meeting Summary"}
              </h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                {formatDate(meeting?.scheduledAt)}
                {meeting?.startedAt ? ` | ${formatTime(meeting.startedAt)}` : ""}
                {meeting?.endedAt ? ` - ${formatTime(meeting.endedAt)}` : ""}
                {duration ? ` | ${duration} min` : ""}
                {participantUsers.length ? ` | ${participantUsers.length} participants` : ""}
              </p>
            </div>
            <span className="badge badge-agent" style={{ height: "fit-content" }}>CC summarized</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <AvatarGroup users={participantUsers.map((participant) => ({ id: Number(participant.id), name: participant.displayName || participant.email }))} size="sm" max={6} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              {participantUsers.map((participant) => participant.displayName || participant.email).join(", ") || "No participants"}
            </span>
          </div>
        </section>

        {recall && <RecallAlert topic={recall} />}

        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>CC</span>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>Summary</h3>
          </div>
          {summary.summaryText.split(/\n{2,}/).map((paragraph, index) => (
            <p
              key={index}
              style={{
                fontSize: "var(--text-sm)",
                lineHeight: 1.7,
                color: "var(--color-primary)",
                marginBottom: index < summary.summaryText.split(/\n{2,}/).length - 1 ? 14 : 0,
              }}
            >
              {paragraph}
            </p>
          ))}
        </section>

        <section className="card">
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 14 }}>Key Decisions</h3>
          {decisions.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {decisions.map((decision, index) => (
                <div key={`${decision}-${index}`} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--color-success)", fontWeight: "var(--font-semibold)", flexShrink: 0, marginTop: 1 }}>OK</span>
                  <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>{decision}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>No key decisions captured.</p>
          )}
        </section>

        <section className="card">
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 14 }}>Action Items</h3>
          <ActionItemsTable items={actionItems} users={users} />
        </section>

        <nav style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)" }}>
          {previousSummary ? (
            <Link href={`/summaries/${previousSummary.id.toString()}`} className="btn btn-secondary">Previous summary</Link>
          ) : <span />}
          {nextSummary ? (
            <Link href={`/summaries/${nextSummary.id.toString()}`} className="btn btn-secondary">Next summary</Link>
          ) : <span />}
        </nav>
      </div>
    </div>
  );
}
