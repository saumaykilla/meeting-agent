"use client";

import { clsx } from "clsx";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "agent" | "live";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={clsx("badge", `badge-${variant}`, className)}>
      {children}
    </span>
  );
}

// Meeting status badge
interface MeetingStatusBadgeProps {
  status: "Scheduled" | "Active" | "Ended";
}

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
  if (status === "Active") return <Badge variant="live">Live Now</Badge>;
  if (status === "Ended") return <Badge variant="default">Ended</Badge>;
  return <Badge variant="default">Scheduled</Badge>;
}

// Role badge
interface RoleBadgeProps {
  role: "Admin" | "Employee";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={role === "Admin" ? "accent" : "default"}>
      {role}
    </Badge>
  );
}
