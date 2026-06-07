"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface RecallAlertProps {
  topic: string;
  href?: string;
}

export function RecallAlert({ topic, href }: RecallAlertProps) {
  return (
    <div className="card-agent">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 8 }}>
        <Avatar name="CC" isAgent size="sm" />
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-agent-text)" }}>
          CC flagged a past discussion
        </span>
      </div>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: 1.55 }}>
        {topic}
        {href && (
          <>
            {" "}
            <Link href={href} style={{ color: "var(--color-agent-text)", fontWeight: "var(--font-semibold)" }}>
              View related summary
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

