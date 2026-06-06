"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/lib/spacetimedb-types/types";

type SummaryPayload = {
  type?: string;
  meeting_id?: number | string;
  meetingId?: number | string;
  title?: string;
  summary?: string;
  preview?: string;
};

function formatTime(value: bigint | number | string) {
  return new Date(Number(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseSummary(content: string): SummaryPayload | null {
  try {
    const parsed = JSON.parse(content) as SummaryPayload;
    if (parsed.type === "summary" || parsed.meeting_id || parsed.meetingId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function AgentMessageCard({ message }: { message: Message }) {
  const summary = parseSummary(message.content);
  const meetingId = summary?.meeting_id ?? summary?.meetingId;

  return (
    <div className="message-agent" style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Avatar name="CC" isAgent size="sm" />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-agent-text)",
          }}
        >
          CC Assistant
        </span>
        <span className="message-timestamp" style={{ opacity: 1 }}>
          {formatTime(message.sentAt)}
        </span>
      </div>

      {summary ? (
        <div>
          <h3 style={{ fontSize: "var(--text-md)", marginBottom: 6 }}>
            {summary.title || "Meeting Summary"}
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)", lineHeight: 1.6 }}>
            {summary.preview || summary.summary || "CC generated a new meeting summary."}
          </p>
          {meetingId && (
            <Link
              href={`/summaries/${meetingId}`}
              style={{
                display: "inline-flex",
                marginTop: 10,
                fontSize: "var(--text-sm)",
                color: "var(--color-agent-text)",
                fontWeight: 600,
              }}
            >
              View full summary →
            </Link>
          )}
        </div>
      ) : (
        <div className="message-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
