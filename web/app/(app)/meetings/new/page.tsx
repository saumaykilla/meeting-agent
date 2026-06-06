"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";

const MOCK_USERS = [
  { id: 1, name: "Sarah Johnson" },
  { id: 2, name: "James Lee" },
  { id: 3, name: "Maria Chen" },
  { id: 4, name: "Tom Walker" },
  { id: 5, name: "Alex Rivera" },
];
const CURRENT_USER_ID = 1;

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [participantIds, setParticipantIds] = useState<number[]>([CURRENT_USER_ID]);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const unselectedUsers = MOCK_USERS.filter(
    (u) => !participantIds.includes(u.id) &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleUser(id: number) {
    if (id === CURRENT_USER_ID) return; // can't remove self
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Meeting title is required.";
    if (!date) e.date = "Date is required.";
    if (!time) e.time = "Time is required.";
    if (participantIds.length < 1) e.participants = "Add at least one participant.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // TODO: SpacetimeDB create_meeting reducer
      await new Promise((r) => setTimeout(r, 700));
      router.push("/meetings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.back()}
          style={{ marginRight: 4 }}
        >
          ← Back
        </button>
        <h1 className="page-title">Schedule Meeting</h1>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-6)",
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "var(--space-6)",
          alignItems: "start",
        }}
      >
        {/* Left — main form */}
        <form onSubmit={handleSubmit}>
          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
          >
            <Input
              label="Meeting title"
              placeholder="e.g. Q3 Planning Session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              autoFocus
            />

            <Textarea
              label="Description (optional)"
              placeholder="What will this meeting cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={errors.date}
              />
              <Input
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                error={errors.time}
              />
            </div>

            {/* Duration */}
            <div className="form-field">
              <label className="form-label">Duration</label>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={`btn btn-${duration === d.value ? "primary" : "secondary"} btn-sm`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CC Agent toggle */}
            <div className="toggle-wrapper">
              <div>
                <div className="toggle-label">CC Assistant joins automatically</div>
                <div className="toggle-hint">
                  CC will listen, flag repeated topics, and generate a summary.
                </div>
              </div>
              <div
                className={`toggle ${agentEnabled ? "on" : ""}`}
                onClick={() => setAgentEnabled(!agentEnabled)}
              />
            </div>
          </div>

          <div style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Schedule Meeting
            </Button>
          </div>
        </form>

        {/* Right — participant picker */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>
            Participants
          </h3>

          {/* Selected */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {participantIds.map((id) => {
              const user = MOCK_USERS.find((u) => u.id === id)!;
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "6px 8px",
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Avatar name={user.name} size="sm" />
                  <span style={{ flex: 1, fontSize: "var(--text-sm)" }}>{user.name}</span>
                  {id === CURRENT_USER_ID ? (
                    <span className="badge badge-default">You</span>
                  ) : (
                    <button
                      onClick={() => toggleUser(id)}
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-muted)",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: "0 4px",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Search + add */}
          <div>
            <input
              className="input"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: "var(--space-2)" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxHeight: 200, overflow: "auto" }}>
              {unselectedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "7px 8px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    width: "100%",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <Avatar name={u.name} size="sm" />
                  <span style={{ fontSize: "var(--text-sm)" }}>{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          {errors.participants && (
            <span className="form-error">{errors.participants}</span>
          )}
        </div>
      </div>
    </div>
  );
}
