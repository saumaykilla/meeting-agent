import type { Meeting, MeetingParticipant, MeetingSummary, User } from "@/lib/spacetimedb-types/types";

export function bigintToMs(value: bigint | number | string | undefined | null) {
  if (value === undefined || value === null) return 0;
  return Number(value);
}

export function formatMeetingTime(value: bigint | number | string) {
  return new Date(bigintToMs(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMeetingDate(value: bigint | number | string) {
  return new Date(bigintToMs(value)).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function userName(user: User | undefined) {
  return user?.displayName || user?.email || "Unknown user";
}

export function meetingParticipants(
  meetingId: bigint,
  participants: MeetingParticipant[],
  users: User[]
) {
  const ids = new Set(
    participants
      .filter((participant) => participant.meetingId === meetingId)
      .map((participant) => participant.userId)
  );
  return users.filter((user) => ids.has(user.id));
}

export function latestSummaryForMeeting(meetingId: bigint, summaries: MeetingSummary[]) {
  return summaries
    .filter((summary) => summary.meetingId === meetingId)
    .sort((a, b) => bigintToMs(b.generatedAt) - bigintToMs(a.generatedAt))[0];
}

export function canJoinMeeting(meeting: Meeting) {
  if (meeting.status === "Active") return true;
  if (meeting.status !== "Scheduled") return false;
  const fiveMinutesBefore = bigintToMs(meeting.scheduledAt) - 5 * 60 * 1000;
  return Date.now() >= fiveMinutesBefore;
}

export function meetingStartsIn(meeting: Meeting) {
  const diffMs = bigintToMs(meeting.scheduledAt) - Date.now();
  if (diffMs <= 0) return "Ready to start";
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `Starts in ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
}
