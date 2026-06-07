"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";
import type { User } from "@/lib/spacetimedb-types/types";

type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  identity: string | undefined;
  companyName: string;
  savedToken: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, identity, db } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [needToken, setNeedToken] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  // If user is already loaded, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const shortIdentity = useMemo(() => {
    if (!identity) return "Connecting...";
    return `${identity.slice(0, 10)}…${identity.slice(-8)}`;
  }, [identity]);

  // Extract all registered users for the developer picker
  const registeredUsers = useMemo(() => {
    if (!db) return [];
    const usersList: RegisteredUser[] = [];
    const companies = Array.from(db.db.company.iter());
    
    for (const u of db.db.user.iter()) {
      if (!u.isActive) continue; // skip pending invites
      const comp = companies.find((c) => c.id === u.companyId);
      const savedToken = typeof window !== "undefined" ? localStorage.getItem(`cc_token_${u.email.toLowerCase()}`) : null;
      
      usersList.push({
        id: u.id.toString(),
        name: u.displayName,
        email: u.email,
        role: u.role,
        identity: u.identity,
        companyName: comp ? comp.name : `Company #${u.companyId}`,
        savedToken: savedToken,
      });
    }
    return usersList;
  }, [db]);

  function startNewSession() {
    localStorage.removeItem("spacetimedb_token");
    window.location.reload();
  }

  function handleDemoLogin(token: string | null) {
    if (!token) return;
    localStorage.setItem("spacetimedb_token", token);
    window.location.reload();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    
    if (!email.trim()) {
      setErrors({ email: "Email address is required." });
      return;
    }

    if (!db) {
      setErrors({ submit: "Connecting to server... Please wait a moment." });
      return;
    }

    setLoading(true);

    try {
      // 1. Find user in database by email
      let foundUser: User | null = null;
      for (const u of db.db.user.iter()) {
        if (u.email.toLowerCase() === email.trim().toLowerCase()) {
          foundUser = u;
          break;
        }
      }

      if (!foundUser) {
        setErrors({ email: "No registered user found with this email." });
        setLoading(false);
        return;
      }

      // 2. If user exists, check if identity matches current browser session
      if (identity && foundUser.identity === identity) {
        // Already logged in using this identity (just wait for AuthProvider redirect)
        router.push("/dashboard");
        return;
      }

      // 3. Check if we have the token for this email stored locally in this browser
      const savedToken = localStorage.getItem(`cc_token_${email.trim().toLowerCase()}`);
      if (savedToken) {
        // Recover session with saved token
        localStorage.setItem("spacetimedb_token", savedToken);
        window.location.reload();
        return;
      }

      // 4. If no saved token and the user hasn't entered one, prompt for it
      if (!needToken && !tokenInput.trim()) {
        setNeedToken(true);
        setErrors({
          submit: "This email is registered to a different browser session/device. To log in, please paste your SpacetimeDB Token (Access Key) below.",
        });
        setLoading(false);
        return;
      }

      // 5. If they entered a token, authenticate using that token
      if (tokenInput.trim()) {
        localStorage.setItem("spacetimedb_token", tokenInput.trim());
        window.location.reload();
        return;
      } else {
        setErrors({ token: "Access Token is required to connect to this account." });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrors({ submit: "An unexpected error occurred during sign in." });
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">CC</div>

        <h1 className="auth-title">Sign in to your account</h1>
        <p className="auth-subtitle">
          CC uses SpacetimeDB session tokens instead of app passwords.
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
              label="Password (optional)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Passwords are mock for visual parity; SpacetimeDB uses session tokens."
              disabled={loading}
            />

            {needToken && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <Input
                  label="SpacetimeDB Access Token / Key"
                  placeholder="Paste your token here"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setErrors({});
                  }}
                  error={errors.token}
                  disabled={loading}
                />
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", lineHeight: 1.4 }}>
                  You can find your Access Token in the **Profile Settings** of your logged-in device, or copy it from localStorage `spacetimedb_token`.
                </p>
              </div>
            )}

            {errors.submit && (
              <div
                style={{
                  background: needToken ? "var(--color-warning-dim)" : "var(--color-danger-dim)",
                  border: `1px solid ${needToken ? "var(--color-warning)" : "var(--color-danger)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px",
                  fontSize: "var(--text-sm)",
                  color: needToken ? "var(--color-warning)" : "var(--color-danger)",
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
              {needToken ? "Verify & Sign In" : "Sign In"}
            </Button>

            {/* Current session info */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                fontSize: "var(--text-xs)",
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-muted)", marginBottom: 4 }}>
                <span>Browser identity</span>
                <button
                  type="button"
                  onClick={startNewSession}
                  style={{
                    color: "var(--color-accent)",
                    fontWeight: 500,
                    fontSize: "var(--text-xs)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  Reset session
                </button>
              </div>
              <code style={{ color: "var(--color-primary)", wordBreak: "break-all" }}>
                {shortIdentity}
              </code>
            </div>
          </form>
        )}

        {/* Collapsible Demo / Dev picker */}
        {!isLoading && registeredUsers.length > 0 && (
          <div style={{ marginTop: 24, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "var(--color-muted)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                cursor: "pointer",
              }}
            >
              <span>Developer Account Picker ({registeredUsers.length})</span>
              <span>{showDemoAccounts ? "▲" : "▼"}</span>
            </button>

            {showDemoAccounts && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                {registeredUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px 10px",
                      fontSize: "var(--text-xs)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{u.name}</span>{" "}
                        <span style={{ color: "var(--color-muted)" }}>({u.role})</span>
                        <div style={{ color: "var(--color-muted)", fontSize: "10px" }}>{u.email} • {u.companyName}</div>
                      </div>
                      
                      {u.savedToken ? (
                        <button
                          type="button"
                          onClick={() => handleDemoLogin(u.savedToken)}
                          style={{
                            background: "var(--color-accent-dim)",
                            color: "var(--color-accent)",
                            border: "1px solid var(--color-accent)",
                            borderRadius: "var(--radius-sm)",
                            padding: "2px 6px",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Sign In
                        </button>
                      ) : (
                        <span style={{ color: "var(--color-muted)", fontSize: "9px" }}>No local token</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="auth-footer">
          New workspace? <Link href="/register">Create company account</Link>
        </p>
      </div>
    </div>
  );
}
