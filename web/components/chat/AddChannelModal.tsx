"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AddChannelModal({ onClose }: { onClose: () => void }) {
  const { db, user } = useAuth();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !db || !user) return;

    setLoading(true);
    try {
      // Normalize name (lowercase, replace spaces with hyphens)
      const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "-");
      await db.reducers.createChannel({
        name: normalizedName,
        isPrivate,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create channel", error);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 16 }}>
          Create a channel
        </h2>
        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: 24 }}>
          Channels are where your team communicates. They&apos;re best when organized around a topic — #marketing, for example.
        </p>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", marginBottom: 6 }}>
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. plan-budget"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>Make private</span>
            </label>
            {isPrivate && (
              <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginTop: 4, marginLeft: 24 }}>
                When a channel is set to private, it can only be viewed or joined by invitation.
              </p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
