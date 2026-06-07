"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";
import { hashPassword } from "@/lib/password";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { user, db } = useAuth();

  // If user becomes available (meaning registration succeeded), redirect
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.companyName.trim() || form.companyName.length < 2)
      e.companyName = "Company name must be at least 2 characters.";
    if (!form.displayName.trim() || form.displayName.length < 2)
      e.displayName = "Name must be at least 2 characters.";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      e.email = "Enter a valid email address.";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password)
      e.confirmPassword = "Passwords do not match.";
    if (!form.agreed) e.agreed = "You must accept the terms.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (!db) {
      setErrors({ submit: "Not connected to server. Please wait..." });
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(form.email, form.password);
      await db.reducers.registerCompany({
        companyName: form.companyName,
        adminName: form.displayName,
        email: form.email,
        passwordHash,
      });
      // On success, AuthProvider's onInsert fires, sets user → redirect via useEffect above.
    } catch (err: unknown) {
      console.error(err);
      setErrors({
        submit:
          "Company registration failed. The company name or email may already be taken.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">CC</div>

        <h1 className="auth-title">Create your company</h1>
        <p className="auth-subtitle">
          Set up CC for your team with an email and password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Company name"
            placeholder="Acme Corp"
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            error={errors.companyName}
            autoFocus
          />

          <Input
            label="Your name"
            placeholder="Sarah Johnson"
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            error={errors.displayName}
          />

          <Input
            label="Work email"
            type="email"
            placeholder="sarah@company.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
          />

          <Input
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            error={errors.confirmPassword}
          />

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: "var(--text-sm)",
              color: "var(--color-muted)",
              cursor: "pointer",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => set("agreed", e.target.checked)}
              style={{ marginTop: 3, accentColor: "var(--color-accent)" }}
            />
            <span>
              I agree to the{" "}
              <span className="inline-link">Terms of Service</span> and{" "}
              <span className="inline-link">Privacy Policy</span>
            </span>
          </label>
          {errors.agreed && (
            <span className="form-error">{errors.agreed}</span>
          )}

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
            variant="primary"
            size="lg"
            loading={loading}
            style={{ width: "100%", marginTop: 4 }}
          >
            Create account
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
