"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/AuthProvider";
import type { CompanySetting, Meeting, User } from "@/lib/spacetimedb-types/types";

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const { user, db } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [participantIds, setParticipantIds] = useState<bigint[]>([]);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [team, setTeam] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db || !user) return;

    const refresh = () => {
      const companyUsers = Array.from(db.db.user.iter())
        .filter((teamUser) => teamUser.companyId === user.companyId && teamUser.isActive)
        .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      setTeam(companyUsers);
      setParticipantIds((prev) => (prev.includes(user.id) ? prev : [user.id, ...prev]));

      const setting = Array.from(db.db.companySetting.iter()).find(
        (candidate: CompanySetting) => candidate.companyId === user.companyId
      );
      if (setting) setAgentEnabled(setting.agentAutoJoin);
    };

    refresh();
    db.db.user.onInsert(refresh);
    db.db.user.onUpdate(refresh);
    db.db.user.onDelete(refresh);
    db.db.companySetting.onInsert(refresh);
    db.db.companySetting.onUpdate(refresh);
    db.db.companySetting.onDelete(refresh);

    return () => {
      db.db.user.removeOnInsert(refresh);
      db.db.user.removeOnUpdate(refresh);
      db.db.user.removeOnDelete(refresh);
      db.db.companySetting.removeOnInsert(refresh);
      db.db.companySetting.removeOnUpdate(refresh);
      db.db.companySetting.removeOnDelete(refresh);
    };
  }, [db, user]);

  const unselectedUsers = useMemo(
    () =>
      team.filter(
        (teamUser) =>
          !participantIds.includes(teamUser.id) &&
          `${teamUser.displayName} ${teamUser.email}`.toLowerCase().includes(search.toLowerCase())
      ),
    [participantIds, search, team]
  );

  function toggleUser(id: bigint) {
    if (id === user?.id) return;
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    const scheduledAt = date && time ? new Date(`${date}T${time}`) : null;
    if (!title.trim()) nextErrors.title = "Meeting title is required.";
    if (!date) nextErrors.date = "Date is required.";
    if (!time) nextErrors.time = "Time is required.";
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) nextErrors.time = "Choose a valid date and time.";
    if (participantIds.length < 1) nextErrors.participants = "Add at least one participant.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user || !validate()) return;
    setLoading(true);
    try {
      const scheduledAt = BigInt(new Date(`${date}T${time}`).getTime());
      const meetingUuid = crypto.randomUUID();
      await db.reducers.createMeeting({
        uuid: meetingUuid,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        participantIds,
        agentEnabled,
      });

      router.push(`/meetings/${meetingUuid}`);
    } catch (error) {
      console.error("Failed to schedule meeting", error);
      setErrors({ submit: "Failed to schedule meeting. Please try again." });
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginRight: 4 }}>
          ← Back
        </button>
        <h1 className="page-title">Schedule Meeting</h1>
      </div>

      <div className="responsive-grid-sidebar page-content">
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Input label="Meeting title" placeholder="e.g. Q3 Planning Session" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} autoFocus />
            <Textarea label="Description (optional)" placeholder="What will this meeting cover?" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
              <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} error={errors.time} />
            </div>

            <div className="form-field">
              <label className="form-label">Duration</label>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {DURATIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setDuration(option.value)} className={`btn btn-${duration === option.value ? "primary" : "secondary"} btn-sm`}>
                    {option.label}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                Duration is used for scheduling context; the LiveKit room ends when participants leave or the host ends it.
              </p>
            </div>

            <div className="toggle-wrapper">
              <div>
                <div className="toggle-label">CC Assistant joins automatically</div>
                <div className="toggle-hint">CC listens, flags repeated topics, and generates a summary.</div>
              </div>
              <button type="button" aria-pressed={agentEnabled} className={`toggle ${agentEnabled ? "on" : ""}`} onClick={() => setAgentEnabled(!agentEnabled)} />
            </div>

            {errors.submit && <div className="form-error">{errors.submit}</div>}
          </div>

          <div style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>Schedule Meeting</Button>
          </div>
        </form>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>Participants</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {participantIds.map((id) => {
              const participant = team.find((teamUser) => teamUser.id === id) || user;
              return (
                <div key={id.toString()} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "6px 8px", background: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
                  <Avatar name={participant.displayName || participant.email} size="sm" />
                  <span style={{ flex: 1, fontSize: "var(--text-sm)" }}>{participant.displayName || participant.email}</span>
                  {id === user.id ? (
                    <span className="badge badge-default">You</span>
                  ) : (
                    <button type="button" onClick={() => toggleUser(id)} style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", cursor: "pointer", background: "none", border: "none", padding: "0 4px" }}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <input className="input" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: "var(--space-2)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxHeight: 200, overflow: "auto" }}>
              {unselectedUsers.map((teamUser) => (
                <button key={teamUser.id.toString()} type="button" onClick={() => toggleUser(teamUser.id)} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "7px 8px", borderRadius: "var(--radius-md)", cursor: "pointer", background: "none", border: "none", textAlign: "left", width: "100%" }}>
                  <Avatar name={teamUser.displayName || teamUser.email} size="sm" />
                  <span style={{ fontSize: "var(--text-sm)" }}>{teamUser.displayName || teamUser.email}</span>
                </button>
              ))}
            </div>
          </div>

          {errors.participants && <span className="form-error">{errors.participants}</span>}
        </div>
      </div>
    </div>
  );
}
