import Link from "next/link";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

const MOCK_SUMMARIES = [
  {
    id: 1,
    meetingTitle: "Engineering Standup",
    date: "Jun 5, 2026",
    duration: 28,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 2, name: "James Lee" },
      { id: 4, name: "Tom Walker" },
    ],
    preview: "The team agreed to prioritize the auth refactor before the July release. Backend tasks assigned to James and Tom. API migration pushed to Q4.",
    tags: ["auth refactor", "API migration", "Q4 planning"],
  },
  {
    id: 2,
    meetingTitle: "Investor Prep",
    date: "Jun 4, 2026",
    duration: 45,
    participants: [
      { id: 1, name: "Sarah Johnson" },
      { id: 3, name: "Maria Chen" },
    ],
    preview: "Slide deck reviewed and approved. Key metrics to highlight: 40% MoM growth, NPS 72. Full demo walkthrough rehearsed twice.",
    tags: ["investor deck", "metrics", "growth"],
  },
  {
    id: 3,
    meetingTitle: "Design Sync",
    date: "Jun 3, 2026",
    duration: 35,
    participants: [
      { id: 3, name: "Maria Chen" },
      { id: 5, name: "Alex Rivera" },
    ],
    preview: "New component library reviewed. Mobile nav patterns agreed. Alex will deliver high-fidelity prototypes by Friday.",
    tags: ["components", "mobile", "prototypes"],
  },
];

export default function SummariesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ flex: 1 }}>
          Meeting Summaries
        </h1>
        {/* CC memory stat */}
        <div
          className="card-agent"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-agent-text)", fontWeight: "var(--font-semibold)" }}>
            ◉ 12 meetings indexed
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-card)",
        }}
      >
        <input
          className="input"
          placeholder="Search meetings, topics, decisions..."
          style={{ maxWidth: 480 }}
        />
      </div>

      {/* Summary list */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {MOCK_SUMMARIES.map((s) => (
          <Link key={s.id} href={`/summaries/${s.id}`} style={{ display: "block" }}>
            <div
              className="card card-accent"
              style={{
                cursor: "pointer",
                transition: "box-shadow var(--transition-fast)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>
                  {s.meetingTitle}
                </h3>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0, marginLeft: 12 }}>
                  {s.date} · {s.duration}m
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: 10 }}>
                <AvatarGroup users={s.participants} size="sm" max={4} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                  {s.participants.map((p) => p.name.split(" ")[0]).join(", ")}
                </span>
              </div>

              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-muted)",
                  lineHeight: 1.55,
                  marginBottom: 12,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {s.preview}
              </p>

              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {s.tags.map((tag) => (
                  <span key={tag} className="badge badge-default">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
