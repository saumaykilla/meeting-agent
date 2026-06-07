"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";

const settingsNav = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Notifications", href: "/settings/profile#notifications" },
  { label: "Security", href: "/settings/profile#security" },
];

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-wrapper">
      <div>
        <div className="toggle-label">{label}</div>
        <div className="toggle-hint">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle${checked ? " on" : ""}`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, token, isLoading, db, logout } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    jobTitle: "",
    department: "",
    showOnlineStatus: true,
    notifyMeetingInvites: true,
    notifySummaryNotifications: true,
    allowDirectMessagesFromAll: true,
  });
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const storageKey = `cc_profile_${user.id.toString()}`;
      // The editable form mirrors the subscribed user row after profile reducer updates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        displayName: user.displayName || "",
        email: user.email || "",
        jobTitle: localStorage.getItem(`${storageKey}_jobTitle`) || "",
        department: localStorage.getItem(`${storageKey}_department`) || "",
        showOnlineStatus: localStorage.getItem(`${storageKey}_showOnlineStatus`) !== "false",
        notifyMeetingInvites: localStorage.getItem(`${storageKey}_notifyMeetingInvites`) !== "false",
        notifySummaryNotifications: localStorage.getItem(`${storageKey}_notifySummaryNotifications`) !== "false",
        allowDirectMessagesFromAll: localStorage.getItem(`${storageKey}_allowDirectMessagesFromAll`) !== "false",
      });
    }
  }, [user]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user) {
      toast("Still connecting to SpacetimeDB", "error");
      return;
    }
    if (form.displayName.trim().length < 2) {
      toast("Display name must be at least 2 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const storageKey = `cc_profile_${user.id.toString()}`;
      localStorage.setItem(`${storageKey}_jobTitle`, form.jobTitle.trim());
      localStorage.setItem(`${storageKey}_department`, form.department.trim());
      localStorage.setItem(`${storageKey}_showOnlineStatus`, String(form.showOnlineStatus));
      localStorage.setItem(`${storageKey}_notifyMeetingInvites`, String(form.notifyMeetingInvites));
      localStorage.setItem(`${storageKey}_notifySummaryNotifications`, String(form.notifySummaryNotifications));
      localStorage.setItem(`${storageKey}_allowDirectMessagesFromAll`, String(form.allowDirectMessagesFromAll));
      await db.reducers.updateUserProfile({
        displayName: form.displayName.trim(),
      });
      toast("Profile settings saved", "success");
    } catch (err) {
      console.error(err);
      toast("Could not save profile settings", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveCompany() {
    if (!db) return;
    const confirmed = window.confirm("Are you sure? You will lose access to all CC data for this company.");
    if (!confirmed) return;

    setLeaving(true);
    try {
      await db.reducers.leaveCompany({});
      toast("You left the company", "success");
      logout();
    } catch (err) {
      console.error(err);
      toast("Transfer admin role before leaving", "error");
      setLeaving(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", gap: 12 }}>
        <p style={{ color: "var(--color-danger)" }}>Please sign in to view your profile settings.</p>
        <Button variant="primary" onClick={() => window.location.href = "/login"}>Go to Sign In</Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
        <SettingsLayout navItems={settingsNav}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <section className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
              <Avatar name={form.displayName || form.email} size="xl" online={form.showOnlineStatus} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>{form.displayName}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>{form.email}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => toast("Avatar uploads are coming soon", "default")}>
                Change photo
              </Button>
            </section>

            <section className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>Account details</h2>
              <Input label="Display name" value={form.displayName} onChange={(event) => set("displayName", event.target.value)} />
              <Input label="Email" type="email" value={form.email} disabled hint="Email addresses are managed by your company admin." />
              <Input label="Job title" placeholder="e.g. Senior Designer" value={form.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} />
              <Input label="Department" placeholder="e.g. Product" value={form.department} onChange={(event) => set("department", event.target.value)} />
            </section>

            <section id="notifications" className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>Notifications</h2>
              <ToggleRow
                label="Show my online status"
                hint="Teammates can see when you are active in CC."
                checked={form.showOnlineStatus}
                onChange={(value) => set("showOnlineStatus", value)}
              />
              <ToggleRow
                label="Meeting invite notifications"
                hint="Receive notifications when you are added to meetings."
                checked={form.notifyMeetingInvites}
                onChange={(value) => set("notifyMeetingInvites", value)}
              />
              <ToggleRow
                label="Summary notifications"
                hint="Receive CC Assistant notifications when summaries are ready."
                checked={form.notifySummaryNotifications}
                onChange={(value) => set("notifySummaryNotifications", value)}
              />
              <ToggleRow
                label="Direct messages from teammates"
                hint="Allow any active team member to start a DM with you."
                checked={form.allowDirectMessagesFromAll}
                onChange={(value) => set("allowDirectMessagesFromAll", value)}
              />
            </section>

            <section id="security" className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>Security & Session</h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: 1.5 }}>
                CC signs you in with a private SpacetimeDB session token. Keep it secure; anyone with this token can access this account.
              </p>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="SpacetimeDB token"
                    type="password"
                    value={token || ""}
                    readOnly
                    style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!token) return;
                    navigator.clipboard.writeText(token);
                    toast("Access token copied", "success");
                  }}
                  disabled={!token}
                >
                  Copy
                </Button>
              </div>
            </section>

            <section className="card" style={{ borderColor: "var(--color-danger)", display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-danger)", marginBottom: 4 }}>Danger zone</h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Leave this company and remove access for this browser identity.</p>
              </div>
              <Button type="button" variant="danger" loading={leaving} onClick={handleLeaveCompany}>Leave company</Button>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "var(--space-6)" }}>
              <Button type="submit" variant="primary" loading={loading}>Save changes</Button>
            </div>
          </form>
        </SettingsLayout>
      </div>
    </div>
  );
}
