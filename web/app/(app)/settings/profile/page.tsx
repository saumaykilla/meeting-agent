"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const MOCK_USER = {
  name: "Sarah Johnson",
  email: "sarah@acme.com",
  jobTitle: "Head of Product",
  timezone: "America/New_York",
};

export default function ProfileSettingsPage() {
  const [form, setForm] = useState(MOCK_USER);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: SpacetimeDB update_profile reducer
      await new Promise((r) => setTimeout(r, 500));
      toast("Profile updated", "success");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Avatar */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
            <Avatar name={form.name} size="xl" online />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)" }}>{form.name}</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>{form.email}</p>
            </div>
            <Button variant="secondary" size="sm">
              Change photo
            </Button>
          </div>

          {/* Profile form */}
          <form className="card" onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>
              Account details
            </h2>

            <Input
              label="Display name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              disabled
              hint="Contact your admin to change your email."
            />
            <Input
              label="Job title"
              placeholder="e.g. Senior Designer"
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
            />

            <div className="divider" />

            <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", marginBottom: 4 }}>
              Preferences
            </h2>

            <div className="form-field">
              <label className="form-label">Timezone</label>
              <select
                className="input select"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="divider" />

            <div className="toggle-wrapper">
              <div>
                <div className="toggle-label">Email notifications</div>
                <div className="toggle-hint">Receive meeting summaries and invites via email</div>
              </div>
              <div className="toggle on" />
            </div>

            <div className="toggle-wrapper">
              <div>
                <div className="toggle-label">CC Assistant alerts</div>
                <div className="toggle-hint">
                  Allow CC to alert you in meetings when a past topic is repeated
                </div>
              </div>
              <div className="toggle on" />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <Button type="submit" variant="primary" loading={loading}>
                Save changes
              </Button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="card" style={{ borderColor: "var(--color-danger)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: "var(--font-semibold)", color: "var(--color-danger)", marginBottom: 8 }}>
              Danger zone
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: 14 }}>
              Deleting your account is permanent and cannot be undone. All your data will be removed.
            </p>
            <Button variant="danger" size="sm">
              Delete account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
