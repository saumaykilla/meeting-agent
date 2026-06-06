"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const MOCK_EMPLOYEES = [
  { id: 1, name: "Sarah Johnson", email: "sarah@acme.com", role: "Admin" as const, status: "Active", joinedAt: "Jan 1, 2026" },
  { id: 2, name: "James Lee", email: "james@acme.com", role: "Employee" as const, status: "Active", joinedAt: "Jan 3, 2026" },
  { id: 3, name: "Maria Chen", email: "maria@acme.com", role: "Employee" as const, status: "Active", joinedAt: "Jan 5, 2026" },
  { id: 4, name: "Tom Walker", email: "tom@acme.com", role: "Employee" as const, status: "Active", joinedAt: "Feb 10, 2026" },
  { id: 5, name: "Alex Rivera", email: "alex@acme.com", role: "Employee" as const, status: "Invited", joinedAt: "—" },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleInvite(ev: React.FormEvent) {
    ev.preventDefault();
    if (!inviteEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast("Please enter a valid email address.", "error");
      return;
    }
    setInviteLoading(true);
    try {
      // TODO: SpacetimeDB invite_employee reducer + Resend email
      await new Promise((r) => setTimeout(r, 700));
      setShowInviteModal(false);
      setInviteEmail("");
      toast("Invite sent to " + inviteEmail, "success");
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ flex: 1 }}>
          People
        </h1>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginRight: 12 }}>
          {employees.filter((e) => e.status === "Active").length} active ·{" "}
          {employees.filter((e) => e.status === "Invited").length} pending
        </span>
        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          Invite Employee
        </Button>
      </div>

      {/* Search */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-card)",
        }}
      >
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <Avatar name={emp.name} size="md" online={emp.status === "Active"} />
                        <span style={{ fontWeight: "var(--font-medium)" }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>{emp.email}</td>
                    <td>
                      <RoleBadge role={emp.role} />
                    </td>
                    <td>
                      <span
                        className={`badge ${emp.status === "Active" ? "badge-success" : "badge-warning"}`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>{emp.joinedAt}</td>
                    <td>
                      {emp.id !== 1 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-danger)" }}
                          onClick={() => {
                            setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
                            toast(`${emp.name} removed`, "default");
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Employee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" form="invite-form" type="submit" loading={inviteLoading}>
              Send invite
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleInvite}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: 16 }}>
            They&apos;ll receive an email with a link to join your company on CC.
          </p>
          <Input
            label="Work email"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
}
