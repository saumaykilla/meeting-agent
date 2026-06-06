"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import type { Company, MeetingSummary } from "@/lib/spacetimedb-types/types";

const DEFAULT_SETTINGS = {
  agentAutoJoin: true,
  postSummaries: true,
  notifyRepeatedTopics: true,
  topicSensitivity: "Medium",
};

export default function AdminSettingsPage() {
  const { user, db } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [summaryCount, setSummaryCount] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    if (user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    const updateCompany = () => {
      const foundCompany = Array.from(db.db.company.iter()).find((candidate) => candidate.id === user.companyId) || null;
      setCompany(foundCompany);
      setCompanyName(foundCompany?.name || "");
    };

    const updateSettings = () => {
      const foundSettings = Array.from(db.db.companySetting.iter()).find((candidate) => candidate.companyId === user.companyId) || null;
      setForm(foundSettings || DEFAULT_SETTINGS);
    };

    const updateSummaryCount = () => {
      const summaries = Array.from(db.db.meetingSummary.iter()).filter((summary: MeetingSummary) => summary.companyId === user.companyId);
      setSummaryCount(summaries.length);
    };

    updateCompany();
    updateSettings();
    updateSummaryCount();

    db.db.company.onInsert(updateCompany);
    db.db.company.onUpdate(updateCompany);
    db.db.company.onDelete(updateCompany);
    db.db.companySetting.onInsert(updateSettings);
    db.db.companySetting.onUpdate(updateSettings);
    db.db.companySetting.onDelete(updateSettings);
    db.db.meetingSummary.onInsert(updateSummaryCount);
    db.db.meetingSummary.onUpdate(updateSummaryCount);
    db.db.meetingSummary.onDelete(updateSummaryCount);

    return () => {
      db.db.company.removeOnInsert(updateCompany);
      db.db.company.removeOnUpdate(updateCompany);
      db.db.company.removeOnDelete(updateCompany);
      db.db.companySetting.removeOnInsert(updateSettings);
      db.db.companySetting.removeOnUpdate(updateSettings);
      db.db.companySetting.removeOnDelete(updateSettings);
      db.db.meetingSummary.removeOnInsert(updateSummaryCount);
      db.db.meetingSummary.removeOnUpdate(updateSummaryCount);
      db.db.meetingSummary.removeOnDelete(updateSummaryCount);
    };
  }, [user, db, router]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!db) return;
    setLoading(true);
    try {
      if (companyName.trim() && companyName.trim() !== company?.name) {
        await db.reducers.updateCompanyName({ name: companyName.trim() });
      }
      await db.reducers.updateCompanySettings(form);
      toast("Company settings saved", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save settings", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== "Admin") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <h1 className="page-title">Company Settings</h1>
      </div>

      <form onSubmit={saveSettings} style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 600 }}>Company Profile</h2>
            <Input label="Company name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 600 }}>CC Assistant Settings</h2>

            <label className="toggle-wrapper">
              <div>
                <div className="toggle-label">CC Assistant joins meetings automatically</div>
                <div className="toggle-hint">Default on for new meetings.</div>
              </div>
              <input
                type="checkbox"
                checked={form.agentAutoJoin}
                onChange={(event) => setForm((prev) => ({ ...prev, agentAutoJoin: event.target.checked }))}
                style={{ accentColor: "var(--color-accent)" }}
              />
            </label>

            <label className="toggle-wrapper">
              <div>
                <div className="toggle-label">Post meeting summaries to meeting threads</div>
                <div className="toggle-hint">Keep summary cards in context for attendees.</div>
              </div>
              <input
                type="checkbox"
                checked={form.postSummaries}
                onChange={(event) => setForm((prev) => ({ ...prev, postSummaries: event.target.checked }))}
                style={{ accentColor: "var(--color-accent)" }}
              />
            </label>

            <label className="toggle-wrapper">
              <div>
                <div className="toggle-label">Notify team when repeated topics are detected</div>
                <div className="toggle-hint">CC can surface prior discussions during meetings.</div>
              </div>
              <input
                type="checkbox"
                checked={form.notifyRepeatedTopics}
                onChange={(event) => setForm((prev) => ({ ...prev, notifyRepeatedTopics: event.target.checked }))}
                style={{ accentColor: "var(--color-accent)" }}
              />
            </label>

            <div className="form-field">
              <label className="form-label">Topic sensitivity</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Low", "Medium", "High"].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={form.topicSensitivity === value ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, topicSensitivity: value }))}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            <div className="card-agent" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{summaryCount} meetings indexed</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Company knowledge base</div>
              </div>
              <Link href="/summaries" className="btn btn-secondary btn-sm">
                View summaries
              </Link>
            </div>
          </div>

          <div className="card" style={{ borderColor: "var(--color-danger)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--color-danger)", marginBottom: 8 }}>Danger Zone</h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: 14 }}>
              Company deletion is intentionally disabled in this MVP.
            </p>
            <Button type="button" variant="danger" size="sm" disabled>
              Delete Company Account
            </Button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
