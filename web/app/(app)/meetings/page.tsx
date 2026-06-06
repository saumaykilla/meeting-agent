"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Badge, MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const MOCK_MEETINGS = [
  {
    id: 1,
    title: "Q3 Planning Session",
    scheduledAt: "2026-06-06T14:00:00Z",
    endedAt: null,
    status: "Active" as const,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 2, name: "James Lee" },
      { id: 3, name: "Maria Chen" },
    ],
    createdBy: 1,
  },
  {
    id: 2,
    title: "Product Roadmap Review",
    scheduledAt: "2026-06-06T16:00:00Z",
    endedAt: null,
    status: "Scheduled" as const,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 4, name: "Tom Walker" },
    ],
    createdBy: 1,
  },
  {
    id: 3,
    title: "Design Sync",
    scheduledAt: "2026-06-07T10:00:00Z",
    endedAt: null,
    status: "Scheduled" as const,
    participants: [
      { id: 3, name: "Maria Chen" },
      { id: 5, name: "Alex Rivera" },
    ],
    createdBy: 3,
  },
  {
    id: 4,
    title: "Engineering Standup",
    scheduledAt: "2026-06-05T09:00:00Z",
    endedAt: "2026-06-05T09:28:00Z",
    status: "Ended" as const,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 2, name: "James Lee" },
      { id: 4, name: "Tom Walker" },
    ],
    summaryId: 1,
    createdBy: 1,
  },
];

type Tab = "upcoming" | "past" | "mine";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MeetingCard({ meeting }: { meeting: (typeof MOCK_MEETINGS)[0] }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
      {/* Date block */}
      <div
        style={{
          width: 52,
          textAlign: "center",
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          paddingRight: "var(--space-4)",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-muted)",
            textTransform: "uppercase",
          }}
        >
          {new Date(meeting.scheduledAt).toLocaleDateString([], { month: "short" })}
        </div>
        <div
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-bold)",
            lineHeight: 1.2,
          }}
        >
          {new Date(meeting.scheduledAt).getDate()}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: 4,
          }}
        >
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>
            {meeting.title}
          </h3>
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--color-muted)",
          }}
        >
          <span>{formatTime(meeting.scheduledAt)}</span>
          <AvatarGroup users={meeting.participants} size="sm" max={4} />
          <span>{meeting.participants.length} participants</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
        {meeting.status === "Active" && (
          <Link href={`/meetings/${meeting.id}/room`}>
            <Button variant="accent" size="sm">
              Join Now
            </Button>
          </Link>
        )}
        {meeting.status === "Scheduled" && (
          <Link href={`/meetings/${meeting.id}`}>
            <Button variant="secondary" size="sm">
              View
            </Button>
          </Link>
        )}
        {meeting.status === "Ended" && (
          <>
            {(meeting as any).summaryId && (
              <Link href={`/summaries/${(meeting as any).summaryId}`}>
                <Button variant="secondary" size="sm">
                  Summary
                </Button>
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const now = new Date();
  const upcoming = MOCK_MEETINGS.filter(
    (m) => m.status === "Scheduled" || m.status === "Active"
  );
  const past = MOCK_MEETINGS.filter((m) => m.status === "Ended");
  const mine = MOCK_MEETINGS.filter((m) =>
    m.participants.some((p) => p.id === 1)
  );

  const displayed =
    activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : mine;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ flex: 1 }}>
          Meetings
        </h1>
        <Link href="/meetings/new">
          <Button variant="primary">Schedule Meeting</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: "0 var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-card)",
          display: "flex",
          gap: "var(--space-1)",
        }}
      >
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

      {/* List */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">No meetings here</h3>
            <p className="empty-state-body">
              {activeTab === "upcoming"
                ? "No upcoming meetings. Schedule one to get started."
                : "No past meetings found."}
            </p>
            {activeTab === "upcoming" && (
              <Link href="/meetings/new" style={{ marginTop: 8 }}>
                <Button variant="primary">Schedule Meeting</Button>
              </Link>
            )}
          </div>
        ) : (
          displayed.map((m) => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </div>
  );
}
