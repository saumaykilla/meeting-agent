"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { User } from "@/lib/spacetimedb-types/types";

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: bigint;
}

export function InviteEmployeeModal({ isOpen, onClose, companyId }: InviteEmployeeModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Employee">("Employee");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { db } = useAuth();

  useEffect(() => {
    if (!isOpen || !db) return;
    const normalizedEmail = email.trim().toLowerCase();
    let timeoutId: number | undefined;
    
    // Listen for the new user being inserted to grab their token
    const onInsert = async (_ctx: unknown, user: User) => {
      if (user.companyId === companyId && user.email.toLowerCase() === normalizedEmail && user.inviteToken) {
        if (timeoutId) window.clearTimeout(timeoutId);
        // Find company name
        let companyName = "your company";
        for (const c of db.db.company.iter()) {
          if (c.id === companyId) {
            companyName = c.name;
            break;
          }
        }

        try {
          const res = await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              token: user.inviteToken,
              companyName
            })
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null) as { error?: string } | null;
            throw new Error(body?.error || "Failed to send invite email");
          }
          
          toast(`Invite sent to ${user.email}`, "success");
        } catch (e: unknown) {
          toast(e instanceof Error ? e.message : "Failed to send invite email", "error");
        } finally {
          setIsLoading(false);
          onClose();
          setEmail("");
          setRole("Employee");
        }
      }
    };

    db.db.user.onInsert(onInsert);
    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        setIsLoading(false);
        toast("Invite was not created. This email may already exist.", "error");
      }, 7000);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      db.db.user.removeOnInsert(onInsert);
    };
  }, [isOpen, email, companyId, onClose, toast, db, isLoading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsLoading(true);
    
    try {
      db.reducers.createInvite({ email, role });
      // We rely on the onInsert listener above to finish the process.
    } catch (error: unknown) {
      console.error(error);
      toast("Failed to generate invite", "error");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div className="card" style={{ width: 400, padding: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 18, fontWeight: 500 }}>Invite Employee</h2>
        
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
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
