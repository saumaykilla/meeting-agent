"use client";

import { clsx } from "clsx";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  isAgent?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 10;
}

export function Avatar({ name, size = "md", online, isAgent, className }: AvatarProps) {
  const initials = isAgent ? "CC" : getInitials(name);
  const colorIdx = getColorIndex(name);

  return (
    <div
      className={clsx(
        "avatar",
        `avatar-${size}`,
        isAgent ? "avatar-agent" : `avatar-${colorIdx}`,
        online && "avatar-online",
        className
      )}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  users: { name: string; id: number }[];
  max?: number;
  size?: "sm" | "md";
}

export function AvatarGroup({ users, max = 4, size = "sm" }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((user, i) => (
        <div key={user.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: visible.length - i }}>
          <Avatar name={user.name} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            marginLeft: -6,
            zIndex: 0,
            width: size === "sm" ? 24 : 32,
            height: size === "sm" ? 24 : 32,
            borderRadius: "50%",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--color-muted)",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
