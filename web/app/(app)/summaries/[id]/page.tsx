import Link from "next/link";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

const MOCK_SUMMARY = {
  id: 1,
  meetingId: 4,
  meetingTitle: "Engineering Standup",
  date: "June 5, 2026",
  startTime: "9:00 AM",
  endTime: "9:28 AM",
  duration: 28,
  participants: [
    { id: 1, name: "Sarah Johnson" },
    { id: 2, name: "James Lee" },
    { id: 4, name: "Tom Walker" },
  ],
  summary: `The engineering team held their daily standup covering three main areas: current sprint progress, ongoing blockers, and upcoming technical priorities.

James reported that the auth refactor is 70% complete and on track for the end-of-week deadline. Tom flagged a dependency conflict with the legacy session library that needs to be resolved before the API migration can proceed.

The team collectively agreed to delay the API migration to Q4 in order to unblock the mobile release, which is the higher-priority item for the business this quarter. Sarah will communicate this decision to the product team.`,
  keyDecisions: [
    "Auth refactor to be completed by end of week (James owner)",
    "API migration pushed to Q4 to unblock mobile release",
    "Tom to resolve legacy session library dependency conflict",
  ],
  actionItems: [
    { item: "Complete auth refactor PR", owner: "James Lee", dueDate: "Jun 7" },
    { item: "Resolve session library conflict", owner: "Tom Walker", dueDate: "Jun 6" },
    { item: "Communicate API timeline change to product", owner: "Sarah Johnson", dueDate: "Jun 5" },
  ],
  hadRecall: true,
  recallTopic: "API migration timeline",
  recallMeetingDate: "May 29, 2026",
};

export default function SummaryDetailPage({ params }: { params: { id: string } }) {
  const s = MOCK_SUMMARY;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <Link href="/summaries" className="btn btn-ghost btn-sm">
          ← Summaries
        </Link>
        <h1 className="page-title" style={{ flex: 1 }}>
          {s.meetingTitle}
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Meeting meta card */}
        <div className="card card-accent">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>
                {s.meetingTitle}
              </h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                {s.date} · {s.startTime} – {s.endTime} · {s.duration} min
              </p>
            </div>
            <span className="badge badge-agent">✓ CC Summarized</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <AvatarGroup users={s.participants} size="sm" max={6} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              {s.participants.map((p) => p.name).join(", ")}
            </span>
          </div>
        </div>

        {/* CC Recall alert */}
        {s.hadRecall && (
          <div className="card-agent">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 8 }}>
              <Avatar name="CC" isAgent size="sm" />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-agent-text)" }}>
                CC flagged a past discussion
              </span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: 1.55 }}>
              During this meeting, the topic of{" "}
              <strong style={{ color: "var(--color-primary)" }}>&ldquo;{s.recallTopic}&rdquo;</strong>{" "}
              was discussed. CC noted this was also discussed on {s.recallMeetingDate}.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>Summary</h3>
          </div>
          {s.summary.split("\n\n").map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: "var(--text-sm)",
                lineHeight: 1.7,
                color: "var(--color-primary)",
                marginBottom: i < s.summary.split("\n\n").length - 1 ? 14 : 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Key Decisions */}
        <div className="card">
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 14 }}>
            Key Decisions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {s.keyDecisions.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                <span style={{ color: "var(--color-success)", fontWeight: "var(--font-semibold)", flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="card">
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 14 }}>
            Action Items
          </h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Owner</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {s.actionItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: "var(--text-sm)" }}>{item.item}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <Avatar
                          name={item.owner}
                          size="sm"
                        />
                        <span style={{ fontSize: "var(--text-sm)" }}>{item.owner}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                      {item.dueDate || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
