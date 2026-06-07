"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";
import { hashPassword } from "@/lib/password";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, db } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.push(user.mustResetPassword ? "/setup" : "/dashboard");
  }, [user, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrors({ email: "Enter a valid email address." });
      return;
    }
    if (!password) {
      setErrors({ password: "Password is required." });
      return;
    }
    if (!db) {
      setErrors({ submit: "Connecting to server... Please wait a moment." });
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(normalizedEmail, password);
      await db.reducers.login({ email: normalizedEmail, passwordHash });
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Invalid email or password." });
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">CC</div>

        <h1 className="auth-title">Sign in to your account</h1>
        <p className="auth-subtitle">
          Use the email and password for your CC workspace.
        </p>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
            <div className="spinner spinner-lg" />
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              Checking your session status...
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleLogin}>
            <Input
              label="Work email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              error={errors.email}
              autoFocus
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({});
              }}
              error={errors.password}
              disabled={loading}
            />

            {errors.submit && (
              <div
                style={{
                  background: "var(--color-danger-dim)",
                  border: "1px solid var(--color-danger)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-danger)",
                  lineHeight: 1.4,
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
              Sign in
            </Button>
          </form>
        )}

        <p className="auth-footer">
          New workspace? <Link href="/register">Create company account</Link>
        </p>
      </div>
    </div>
  );
}
