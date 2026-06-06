"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Badge, MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const MOCK_MEETING = {
  id: 1,
  title: "Q3 Planning Session",
  scheduledAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // started 5min ago
  status: "Active" as const,
  livekitRoomName: "cc-1-1",
  agentEnabled: true,
  participants: [
    { id: 1, name: "Sarah Johnson" },
    { id: 2, name: "James Lee" },
    { id: 3, name: "Maria Chen" },
    { id: 4, name: "Tom Walker" },
  ],
  createdBy: 1,
};

function useMeetingTimer(startIso: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startIso).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startIso]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MeetingLobbyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const meeting = MOCK_MEETING;
  const timer = useMeetingTimer(meeting.scheduledAt);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/meetings")}>
          ← Meetings
        </button>
        <h1 className="page-title" style={{ flex: 1 }}>
          {meeting.title}
        </h1>
        <MeetingStatusBadge status={meeting.status} />
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-8)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          {/* Meeting info card */}
          <div className="card card-accent">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>
                  {meeting.title}
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                  Started {timer} ago
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", fontVariantNumeric: "tabular-nums" }}>
                  {timer}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>elapsed</div>
              </div>
            </div>

            {/* Participants */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                In this meeting
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {meeting.participants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px 4px 4px",
                      background: "var(--color-surface)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    <Avatar name={p.name} size="sm" online />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Join button */}
            <Link href={`/meetings/${meeting.id}/room`}>
              <Button variant="accent" size="lg" style={{ width: "100%" }}>
                Join Meeting
              </Button>
            </Link>
          </div>

          {/* CC Assistant notice */}
          {meeting.agentEnabled && (
            <div className="card-agent" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Avatar name="CC" isAgent size="md" />
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-agent-text)", marginBottom: 2 }}>
                  CC Assistant is active in this meeting
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                  CC is listening, will flag repeated topics, and generate a summary when the meeting ends.
                  Say &ldquo;@CC&rdquo; to ask a question.
                </p>
              </div>
            </div>
          )}

          {/* Meeting thread preview */}
          <div className="card card-sm">
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", marginBottom: 12 }}>
              Meeting thread
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              Messages from this meeting will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
