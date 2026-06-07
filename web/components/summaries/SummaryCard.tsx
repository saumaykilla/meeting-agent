"use client";

import Link from "next/link";
import { AvatarGroup } from "@/components/ui/Avatar";
import type { Meeting, MeetingSummary, User } from "@/lib/spacetimedb-types/types";

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function extractTags(decisions: string[]): string[] {
  const seen = new Set<string>();
  return decisions
    .flatMap((decision) => decision.split(/[,;]/))
    .map((part) => part.replace(/^\W+|\W+$/g, "").trim())
    .filter((tag) => tag.length > 3 && tag.length < 28)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function formatDate(value: bigint): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Number(value)));
}

function durationMinutes(meeting: Meeting): number | null {
  if (!meeting.startedAt || !meeting.endedAt) return null;
  return Math.max(1, Math.round((Number(meeting.endedAt) - Number(meeting.startedAt)) / 60000));
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

interface SummaryCardProps {
  summary: MeetingSummary;
  meeting?: Meeting;
  participants: User[];
}

export function SummaryCard({ summary, meeting, participants }: SummaryCardProps) {
  const decisions = parseStringArray(summary.keyDecisions);
  const tags = extractTags(decisions);
  const title = meeting?.title || "Untitled meeting";
  const scheduledAt = meeting?.scheduledAt || summary.generatedAt;
  const duration = meeting ? durationMinutes(meeting) : null;

  return (
    <Link href={`/summaries/${summary.id.toString()}`} style={{ display: "block" }}>
      <article className="card card-accent" style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)", marginBottom: 10 }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", minWidth: 0 }}>{title}</h3>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0 }}>
            {formatDate(scheduledAt)}
            {duration ? ` | ${duration}m` : ""}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: 10, minHeight: 24 }}>
          <AvatarGroup users={participants.map((user) => ({ id: Number(user.id), name: user.displayName || user.email }))} size="sm" max={4} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {participants.length ? participants.map((user) => (user.displayName || user.email).split(" ")[0]).join(", ") : "No participants"}
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
          {truncate(summary.summaryText, 220)}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <span key={tag} className="badge badge-default">{tag}</span>
            ))}
          </div>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)", fontWeight: "var(--font-medium)", flexShrink: 0 }}>
            View full summary -&gt;
          </span>
        </div>
      </article>
    </Link>
  );
}
