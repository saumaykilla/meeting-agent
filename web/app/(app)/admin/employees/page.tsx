"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { InviteEmployeeModal } from "@/components/InviteEmployeeModal";
import { useAuth } from "@/components/AuthProvider";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import type { Company, User } from "@/lib/spacetimedb-types/types";

type ConfirmAction =
  | { type: "remove"; user: User }
  | { type: "revoke"; user: User }
  | null;

function formatDate(value: bigint) {
  return new Date(Number(value)).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminEmployeesPage() {
  const { user, db } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [loadingUserId, setLoadingUserId] = useState<bigint | null>(null);

  useEffect(() => {
    if (!user || !db) return;

    if (user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    const updateEmployees = () => {
      const allUsers = Array.from(db.db.user.iter())
        .filter((candidate) => candidate.companyId === user.companyId)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
      setEmployees(allUsers);
    };

    const updateCompany = () => {
      setCompany(Array.from(db.db.company.iter()).find((candidate) => candidate.id === user.companyId) || null);
    };

    updateEmployees();
    updateCompany();

    db.db.user.onInsert(updateEmployees);
    db.db.user.onUpdate(updateEmployees);
    db.db.user.onDelete(updateEmployees);
    db.db.company.onInsert(updateCompany);
    db.db.company.onUpdate(updateCompany);
    db.db.company.onDelete(updateCompany);

    return () => {
      db.db.user.removeOnInsert(updateEmployees);
      db.db.user.removeOnUpdate(updateEmployees);
      db.db.user.removeOnDelete(updateEmployees);
      db.db.company.removeOnInsert(updateCompany);
      db.db.company.removeOnUpdate(updateCompany);
      db.db.company.removeOnDelete(updateCompany);
    };
  }, [user, db, router]);

  const stats = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter((employee) => employee.isActive && !employee.mustResetPassword).length,
      pending: employees.filter((employee) => employee.mustResetPassword).length,
    };
  }, [employees]);

  async function updateRole(targetUser: User, newRole: string) {
    if (!db || targetUser.role === newRole) return;
    setLoadingUserId(targetUser.id);
    try {
      await db.reducers.updateUserRole({ userId: targetUser.id, newRole });
      toast("Role updated", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update role", "error");
    } finally {
      setLoadingUserId(null);
    }
  }

  async function resendInvite(targetUser: User) {
    if (!db || !targetUser.mustResetPassword) return;
    setLoadingUserId(targetUser.id);
    try {
      const password = generateTemporaryPassword();
      const passwordHash = await hashPassword(targetUser.email, password);
      await db.reducers.regenerateInviteToken({ userId: targetUser.id, passwordHash });
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetUser.email,
          password,
          companyName: company?.name || "your company",
        }),
      });
      if (!response.ok) throw new Error(`Temporary password: ${password}`);
      toast(`Temporary password sent to ${targetUser.email}`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to regenerate password", "error");
    } finally {
      setLoadingUserId(null);
    }
  }

  async function runConfirmAction() {
    if (!db || !confirmAction) return;
    setLoadingUserId(confirmAction.user.id);
    try {
      if (confirmAction.type === "remove") {
        await db.reducers.removeUser({ userId: confirmAction.user.id });
        toast("Employee removed", "success");
      } else {
        await db.reducers.revokeInvite({ userId: confirmAction.user.id });
        toast("Employee deleted", "success");
      }
      setConfirmAction(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action failed", "error");
    } finally {
      setLoadingUserId(null);
    }
  }

  if (!user || user.role !== "Admin") return null;

  return (
    <div className="page-container">
      <div className="page-header" style={{ justifyContent: "space-between" }}>
        <h1 className="page-title">People</h1>
        <Button onClick={() => setIsInviteModalOpen(true)}>Invite Employee</Button>
      </div>

      <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div className="stats-grid">
          <div className="card">
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Total Employees</div>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 600 }}>{stats.total}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Active</div>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--color-success)" }}>{stats.active}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Needs Password Reset</div>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--color-warning)" }}>{stats.pending}</div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-only" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <th style={{ padding: "12px 16px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "12px 16px", fontWeight: 500 }}>Email</th>
                <th style={{ padding: "12px 16px", fontWeight: 500 }}>Role</th>
                <th style={{ padding: "12px 16px", fontWeight: 500 }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 500 }}>Joined</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const isPending = employee.mustResetPassword;
                const busy = loadingUserId === employee.id;
                return (
                  <tr key={employee.id.toString()} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={employee.displayName || employee.email} />
                      <span>{employee.displayName || "Pending setup"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-muted)" }}>{employee.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {isPending ? (
                        <Badge variant={employee.role === "Admin" ? "accent" : "default"}>{employee.role}</Badge>
                      ) : (
                        <select
                          className="input select"
                          style={{ width: 130 }}
                          value={employee.role}
                          disabled={busy}
                          onChange={(event) => updateRole(employee, event.target.value)}
                        >
                          <option value="Employee">Employee</option>
                          <option value="Admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {isPending ? (
                        <Badge variant="warning">Needs reset</Badge>
                      ) : employee.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Removed</Badge>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-muted)" }}>{formatDate(employee.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        {isPending ? (
                          <>
                            <Button variant="secondary" size="sm" disabled={busy} onClick={() => resendInvite(employee)}>
                              Regenerate
                            </Button>
                            <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmAction({ type: "revoke", user: employee })}>
                              Revoke
                            </Button>
                          </>
                        ) : employee.isActive ? (
                          <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmAction({ type: "remove", user: employee })}>
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {employees.map((employee) => {
            const isPending = employee.mustResetPassword;
            const busy = loadingUserId === employee.id;
            return (
              <div key={employee.id.toString()} className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={employee.displayName || employee.email} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 500, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {employee.displayName || "Pending setup"}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {employee.email}
                    </div>
                  </div>
                  <div>
                    {isPending ? (
                      <Badge variant="warning">Needs reset</Badge>
                    ) : employee.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="danger">Removed</Badge>
                    )}
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Role:</div>
                  <div>
                    {isPending ? (
                      <Badge variant={employee.role === "Admin" ? "accent" : "default"}>{employee.role}</Badge>
                    ) : (
                      <select
                        className="input select"
                        style={{ width: 130, padding: "4px 28px 4px 8px", minHeight: 32 }}
                        value={employee.role}
                        disabled={busy}
                        onChange={(event) => updateRole(employee, event.target.value)}
                      >
                        <option value="Employee">Employee</option>
                        <option value="Admin">Admin</option>
                      </select>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Joined:</div>
                  <div style={{ fontSize: "var(--text-sm)" }}>{formatDate(employee.createdAt)}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  {isPending ? (
                    <>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => resendInvite(employee)}>
                        Regenerate
                      </Button>
                      <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmAction({ type: "revoke", user: employee })}>
                        Revoke
                      </Button>
                    </>
                  ) : employee.isActive ? (
                    <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmAction({ type: "remove", user: employee })}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <InviteEmployeeModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} companyId={user.companyId} />

      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
        title={confirmAction?.type === "remove" ? `Remove ${confirmAction.user.displayName || confirmAction.user.email}?` : "Revoke employee account?"}
        description={
          confirmAction?.type === "remove"
            ? "They will lose access to CC immediately and their user record will be deleted."
            : "This first-login account will be deleted from the database."
        }
        confirmLabel={confirmAction?.type === "remove" ? "Remove" : "Revoke"}
        confirmVariant="danger"
        loading={!!confirmAction && loadingUserId === confirmAction.user.id}
      />
    </div>
  );
}
