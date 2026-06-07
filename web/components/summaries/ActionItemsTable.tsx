"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { User } from "@/lib/spacetimedb-types/types";

export interface ActionItem {
  item: string;
  owner?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
}

function ownerUser(users: User[], owner?: string | null): User | undefined {
  if (!owner) return undefined;
  const lower = owner.toLowerCase();
  return users.find((user) => {
    const name = (user.displayName || user.email).toLowerCase();
    return name === lower || name.includes(lower) || lower.includes(name);
  });
}

function formatDueDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(parsed));
}

interface ActionItemsTableProps {
  items: ActionItem[];
  users: User[];
}

export function ActionItemsTable({ items, users }: ActionItemsTableProps) {
  if (!items.length) {
    return <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>No action items captured.</p>;
  }

  return (
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
          {items.map((item, index) => {
            const owner = item.owner || "Unassigned";
            const matchedUser = ownerUser(users, item.owner);
            return (
              <tr key={`${item.item}-${index}`}>
                <td style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>{item.item}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Avatar name={matchedUser?.displayName || owner} size="sm" />
                    <span style={{ fontSize: "var(--text-sm)" }}>{matchedUser?.displayName || owner}</span>
                  </div>
                </td>
                <td style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                  {formatDueDate(item.dueDate || item.due_date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

