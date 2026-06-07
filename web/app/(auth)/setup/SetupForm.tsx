"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";
import { hashPassword } from "@/lib/password";

export default function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { isLoading, user, db } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.mustResetPassword) {
      router.push("/dashboard");
      return;
    }
    // The setup form mirrors the subscribed user row once auth has resolved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      displayName: prev.displayName || user.displayName,
    }));
  }, [user, isLoading, router]);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.displayName.trim() || form.displayName.length < 2)
      e.displayName = "Name must be at least 2 characters.";
    if (!form.currentPassword)
      e.currentPassword = "Temporary password is required.";
    if (form.newPassword.length < 8)
      e.newPassword = "New password must be at least 8 characters.";
    if (form.confirmPassword !== form.newPassword)
      e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setLoading(true);
    try {
      if (!db) {
        setErrors({ submit: "Not connected to server. Please try again." });
        setLoading(false);
        return;
      }

      const oldPasswordHash = await hashPassword(user.email, form.currentPassword);
      const newPasswordHash = await hashPassword(user.email, form.newPassword);
      await db.reducers.updatePassword({
        oldPasswordHash,
        newPasswordHash,
        displayName: form.displayName.trim(),
      });
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to reset password. Check the temporary password and try again." });
      setLoading(false);
    }
  }

  if (isLoading || !user || !user.mustResetPassword) {
    return (
      <div className="auth-page">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner spinner-lg" />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
            Loading account setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">CC</div>

        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">
          Finish setup for <strong style={{ color: "var(--color-primary)" }}>{user.email}</strong>
        </p>

        <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <Input
            label="Your name"
            placeholder="Sarah Johnson"
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            error={errors.displayName}
            autoFocus
          />
          <Input
            label="Temporary password"
            type="password"
            value={form.currentPassword}
            onChange={(e) => set("currentPassword", e.target.value)}
            error={errors.currentPassword}
          />
          <Input
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={(e) => set("newPassword", e.target.value)}
            error={errors.newPassword}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            error={errors.confirmPassword}
          />

          {errors.submit && (
            <div
              style={{
                background: "var(--color-danger-dim)",
                border: "1px solid var(--color-danger)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                fontSize: "var(--text-sm)",
                color: "var(--color-danger)",
              }}
            >
              {errors.submit}
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={loading}
            style={{ width: "100%", marginTop: 4 }}
          >
            Save new password
          </Button>
        </form>
      </div>
    </div>
  );
}
