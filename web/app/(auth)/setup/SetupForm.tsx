"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";
import type { Company, User } from "@/lib/spacetimedb-types/types";

export default function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [companyName, setCompanyName] = useState("Your Company");
  const [email, setEmail] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [form, setForm] = useState({
    displayName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { isLoading, user, db } = useAuth();

  useEffect(() => {
    if (user && loading && user.isActive) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (isLoading) return; // Wait for SpacetimeDB to sync

    const resolveInvite = () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      let foundUser: User | null = null;
      let foundCompany: Company | null = null;

      if (!db) return;

      for (const u of db.db.user.iter()) {
        if (u.inviteToken === token) {
          foundUser = u;
          for (const c of db.db.company.iter()) {
            if (c.id === u.companyId) {
              foundCompany = c;
              break;
            }
          }
          break;
        }
      }

      if (foundUser && foundCompany && !foundUser.isActive) {
        setEmail(foundUser.email);
        setCompanyName(foundCompany.name);
        setTokenValid(true);
      } else {
        setTokenValid(false);
      }
    };

    resolveInvite();
  }, [token, isLoading, db]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.displayName.trim() || form.displayName.length < 2)
      e.displayName = "Name must be at least 2 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (!db) {
        setErrors({ submit: "Not connected to server. Please try again." });
        setLoading(false);
        return;
      }

      await db.reducers.acceptInvite({ token: token as string, displayName: form.displayName });
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to set up your account. The invite link may have expired." });
      setLoading(false);
    }
  }

  if (tokenValid === null) {
    return (
      <div className="auth-page">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner spinner-lg" />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
            Verifying invite link...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-logo">CC</div>
          <h1 className="auth-title" style={{ marginBottom: 8 }}>
            Invalid invite link
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: 24 }}>
            This invite link is expired or has already been used.
            Ask your admin to send a new one.
          </p>
          <Button variant="secondary" onClick={() => router.push("/login")}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">CC</div>

        <div
          style={{
            background: "var(--color-agent-bg)",
            border: "1px solid var(--color-agent-border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            marginBottom: 24,
            fontSize: "var(--text-sm)",
          }}
        >
          <span style={{ color: "var(--color-agent-text)", fontWeight: 600 }}>
            {companyName}
          </span>{" "}
          <span style={{ color: "var(--color-muted)" }}>has invited you to join CC</span>
        </div>

        <h1 className="auth-title">Set up your account</h1>
        <p className="auth-subtitle">
          You were invited as{" "}
          <strong style={{ color: "var(--color-primary)" }}>{email}</strong>
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
            label="Email"
            type="email"
            value={email}
            disabled
            hint="Your email is set by the invite and cannot be changed."
          />

          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Joining links this invite to your current SpacetimeDB browser identity.
            CC will not create or store a separate password.
          </p>

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
            Join {companyName}
          </Button>
        </form>
      </div>
    </div>
  );
}
