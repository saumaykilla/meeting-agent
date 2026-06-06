"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { User } from "@/lib/spacetimedb-types/types";
import { Avatar } from "@/components/ui/Avatar";
import { useRouter } from "next/navigation";

export function AddDmModal({ onClose }: { onClose: () => void }) {
  const { db, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const updateUsers = () => {
      const allUsers = Array.from(db.db.user.iter()).filter(
        (u) => u.companyId === user.companyId && u.id !== user.id,
      );
      setUsers(allUsers);
    };

    updateUsers();
  }, [db, user]);

  function handleStartDm(otherUserId: bigint) {
    if (!db || !user) return;
    // Trigger creation on the backend
    db.reducers.openDm({
      otherUserId,
    });
    // Navigate immediately to DM page
    router.push(`/chat/dm/${otherUserId}`);
    onClose();
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
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", marginBottom: 16 }}>
          Direct Messages
        </h2>
        
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          {users.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>No other users in this company.</p>
          ) : (
            users.map((u) => (
              <div 
                key={u.id.toString()}
                onClick={() => handleStartDm(u.id)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 12, 
                  padding: "8px 12px", 
                  cursor: "pointer",
                  borderRadius: "var(--radius-md)"
                }}
                className="hover-bg-gray-100" // using inline styles for hover would need JS, assume minimal custom class or default to simple pointer
              >
                <Avatar name={u.displayName} size="md" online={u.isActive} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>{u.displayName}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
