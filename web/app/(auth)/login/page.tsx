"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, identity } = useAuth();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const shortIdentity = useMemo(() => {
    if (!identity) return "Connecting...";
    return `${identity.slice(0, 10)}…${identity.slice(-8)}`;
  }, [identity]);

  function startNewSession() {
    localStorage.removeItem("spacetimedb_token");
    window.location.reload();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">CC</div>

        <h1 className="auth-title">SpacetimeDB sign in</h1>
        <p className="auth-subtitle">
          CC uses your SpacetimeDB browser identity instead of a separate password.
        </p>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
            <div className="spinner spinner-lg" />
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              Checking your SpacetimeDB session...
            </p>
          </div>
        ) : (
          <div className="auth-form">
            <div
              style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                fontSize: "var(--text-sm)",
              }}
            >
              <div style={{ color: "var(--color-muted)", marginBottom: 4 }}>
                Current identity
              </div>
              <code style={{ color: "var(--color-primary)", wordBreak: "break-all" }}>
                {shortIdentity}
              </code>
            </div>

            <div
              style={{
                background: "var(--color-warning-dim, rgba(245, 158, 11, 0.1))",
                border: "1px solid var(--color-warning, rgba(245, 158, 11, 0.45))",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                fontSize: "var(--text-sm)",
                color: "var(--color-muted)",
                lineHeight: 1.5,
              }}
            >
              No active CC account is linked to this SpacetimeDB identity. Use an
              invite link, create a company, or start a fresh SpacetimeDB session.
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={startNewSession}
              style={{ width: "100%", marginTop: 4 }}
            >
              Start new SpacetimeDB session
            </Button>
          </div>
        )}

        <p className="auth-footer">
          New workspace? <Link href="/register">Create company account</Link>
        </p>
      </div>
    </div>
  );
}
