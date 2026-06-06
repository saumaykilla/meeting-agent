import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, MeetingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Mock data — will be replaced with SpacetimeDB subscriptions
const MOCK_MEETINGS = [
  {
    id: 1,
    title: "Q3 Planning Session",
    scheduledAt: "2026-06-06T14:00:00Z",
    status: "Active" as const,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 2, name: "James Lee" },
      { id: 3, name: "Maria Chen" },
    ],
  },
  {
    id: 2,
    title: "Product Roadmap Review",
    scheduledAt: "2026-06-06T16:00:00Z",
    status: "Scheduled" as const,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 4, name: "Tom Walker" },
    ],
  },
  {
    id: 3,
    title: "Design Sync",
    scheduledAt: "2026-06-06T17:30:00Z",
    status: "Scheduled" as const,
    participants: [
      { id: 3, name: "Maria Chen" },
      { id: 5, name: "Alex Rivera" },
    ],
  },
];

const MOCK_SUMMARIES = [
  {
    id: 1,
    meetingTitle: "Engineering Standup",
    date: "Jun 5, 2026",
    duration: 28,
    preview: "The team agreed to prioritize the auth refactor before the July release. Backend tasks assigned to James and Tom.",
  },
  {
    id: 2,
    meetingTitle: "Investor Prep",
    date: "Jun 4, 2026",
    duration: 45,
    preview: "Slide deck reviewed. Key metrics to highlight: 40% MoM growth, NPS 72. Demo walkthrough rehearsed.",
  },
];

const MOCK_ACTIVITY = [
  { id: 1, text: "James Lee posted in #engineering", time: "5m ago" },
  { id: 2, text: "CC Assistant summarized Engineering Standup", time: "1h ago", agent: true },
  { id: 3, text: "Tom Walker joined the company", time: "3h ago" },
  { id: 4, text: "Maria Chen scheduled Design Sync", time: "4h ago" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Good morning, Sarah 👋</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginTop: 2 }}>
            Friday, June 6, 2026
          </p>
        </div>
        <Link href="/meetings/new">
          <Button variant="primary">Schedule Meeting</Button>
        </Link>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-6)",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "var(--space-6)",
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Today's Meetings */}
          <section>
            <div className="section-header">
              <h2 className="section-title">Today&apos;s Meetings</h2>
              <Link href="/meetings" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {MOCK_MEETINGS.map((meeting) => (
                <div key={meeting.id} className="card card-sm">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-4)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--text-md)",
                            fontWeight: "var(--font-semibold)",
                          }}
                        >
                          {meeting.title}
                        </span>
                        <MeetingStatusBadge status={meeting.status} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--color-muted)",
                          }}
                        >
                          {formatTime(meeting.scheduledAt)}
                        </span>
                        <div style={{ display: "flex", gap: -4 }}>
                          {meeting.participants.slice(0, 4).map((p, i) => (
                            <div key={p.id} style={{ marginLeft: i > 0 ? -6 : 0 }}>
                              <Avatar name={p.name} size="sm" />
                            </div>
                          ))}
                        </div>
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--color-muted)",
                          }}
                        >
                          {meeting.participants.length} participants
                        </span>
                      </div>
                    </div>
                    <Link href={`/meetings/${meeting.id}`}>
                      <Button
                        variant={meeting.status === "Active" ? "accent" : "secondary"}
                        size="sm"
                      >
                        {meeting.status === "Active" ? "Join Now" : "View"}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Summaries */}
          <section>
            <div className="section-header">
              <h2 className="section-title">Recent Summaries</h2>
              <Link href="/summaries" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {MOCK_SUMMARIES.map((s) => (
                <Link key={s.id} href={`/summaries/${s.id}`} style={{ display: "block" }}>
                  <div
                    className="card card-accent card-sm"
                    style={{
                      cursor: "pointer",
                      transition: "box-shadow var(--transition-fast)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)" }}>
                        {s.meetingTitle}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {s.date} · {s.duration}m
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--color-muted)",
                        lineHeight: 1.55,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {s.preview}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* CC Assistant Memory Card */}
          <div className="card-agent">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: 10,
              }}
            >
              <Avatar name="CC" isAgent size="sm" />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)",
                  color: "var(--color-agent-text)",
                }}
              >
                CC Assistant Memory
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-muted)",
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              CC has indexed <strong style={{ color: "var(--color-primary)" }}>12 meetings</strong>{" "}
              in your company&apos;s knowledge base. It will alert your team when topics are repeated.
            </p>
            <Link href="/summaries" className="inline-link" style={{ fontSize: "var(--text-sm)" }}>
              Browse all summaries →
            </Link>
          </div>

          {/* Activity Feed */}
          <div className="card card-sm">
            <h3
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                marginBottom: 12,
              }}
            >
              Team Activity
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {MOCK_ACTIVITY.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "var(--space-2)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: item.agent ? "var(--color-agent-text)" : "var(--color-primary)",
                      lineHeight: 1.4,
                      flex: 1,
                    }}
                  >
                    {item.agent && (
                      <span
                        style={{
                          fontWeight: "var(--font-semibold)",
                        }}
                      >
                        ◉{" "}
                      </span>
                    )}
                    {item.text}
                  </p>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-muted)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
