"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { User } from "@/lib/spacetimedb-types/types";

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: bigint;
}

export function InviteEmployeeModal({ isOpen, onClose, companyId }: InviteEmployeeModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Employee">("Employee");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { db } = useAuth();

  function resetAndClose() {
    setEmail("");
    setRole("Employee");
    setTemporaryPassword("");
    setCreatedEmail("");
    setIsLoading(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen || !db || !temporaryPassword) return;
    const normalizedEmail = email.trim().toLowerCase();
    let timeoutId: number | undefined;

    const onInsert = async (_ctx: unknown, user: User) => {
      if (user.companyId !== companyId || user.email.toLowerCase() !== normalizedEmail || !user.mustResetPassword) {
        return;
      }
      if (timeoutId) window.clearTimeout(timeoutId);

      let companyName = "your company";
      for (const c of db.db.company.iter()) {
        if (c.id === companyId) {
          companyName = c.name;
          break;
        }
      }

      setCreatedEmail(user.email);
      try {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            password: temporaryPassword,
            companyName,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error || "Failed to send invite email");
        }

        toast(`Temporary password sent to ${user.email}`, "success");
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : "Account created. Copy the temporary password below.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    db.db.user.onInsert(onInsert);
    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        setIsLoading(false);
        toast("Employee account was not created. This email may already exist.", "error");
      }, 7000);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      db.db.user.removeOnInsert(onInsert);
    };
  }, [isOpen, email, companyId, onClose, toast, db, isLoading, temporaryPassword]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsLoading(true);

    try {
      const password = generateTemporaryPassword();
      const passwordHash = await hashPassword(email, password);
      setTemporaryPassword(password);
      await db.reducers.createInvite({ email, role, passwordHash });
    } catch (error: unknown) {
      console.error(error);
      toast("Failed to create employee account", "error");
      setTemporaryPassword("");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div className="card" style={{ width: 420, padding: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 18, fontWeight: 500 }}>Invite Employee</h2>

        {temporaryPassword && createdEmail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
              Share this temporary password with {createdEmail}. They will be asked to set a new password on first sign-in.
            </p>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: 6 }}>Temporary password</div>
              <code style={{ color: "var(--color-primary)", fontSize: "var(--text-md)", wordBreak: "break-all" }}>{temporaryPassword}</code>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(temporaryPassword);
                  toast("Temporary password copied", "success");
                }}
              >
                Copy
              </button>
              <button type="button" className="btn btn-primary" onClick={resetAndClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="colleague@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="input"
                value={role}
                onChange={e => setRole(e.target.value as "Admin" | "Employee")}
                disabled={isLoading}
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-ghost" onClick={resetAndClose} disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
