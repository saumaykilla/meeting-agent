"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DbConnection } from "@/lib/spacetimedb-types";
import { SPACETIMEDB_URI, SPACETIMEDB_MODULE } from "@/lib/spacetimedb";
import type { User } from "@/lib/spacetimedb-types/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  token: string | null;
  identity: string | null;
  db: DbConnection | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const [db, setDb] = useState<DbConnection | null>(null);

  // Use a ref so callbacks always see the latest identity without re-registering
  const identityRef = useRef<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("spacetimedb_token") || undefined;

    console.log("ℹ️ INFO Connecting to SpacetimeDB WS...");

    const conn = DbConnection.builder()
      .withUri(SPACETIMEDB_URI)
      .withDatabaseName(SPACETIMEDB_MODULE)
      .withToken(savedToken)
      .onConnect((connection, ident, tok) => {
        console.log("✅ Connected to SpacetimeDB, identity:", ident.toHexString());

        const identHex = ident.toHexString();
        identityRef.current = identHex;
        setIdentity(identHex);
        setToken(tok);
        localStorage.setItem("spacetimedb_token", tok);

        // Subscribe to all needed tables
        connection
          .subscriptionBuilder()
          .onApplied(() => {
            console.log("✅ Subscription applied");
            setIsLoading(false);

            // Now find the current user from the local cache
            for (const u of connection.db.user.iter()) {
              if (u.identity === identHex) {
                setUser(u);
                break;
              }
            }
          })
          .onError((ctx) => {
            console.error("❌ Subscription error:", ctx);
            setIsLoading(false);
          })
          .subscribe([
            "SELECT * FROM user",
            "SELECT * FROM company",
            "SELECT * FROM company_setting",
            "SELECT * FROM channel",
            "SELECT * FROM channel_member",
            "SELECT * FROM dm_conversation",
            "SELECT * FROM message",
            "SELECT * FROM meeting",
            "SELECT * FROM meeting_participant",
            "SELECT * FROM meeting_summary",
          ]);

        // Register table change callbacks
        connection.db.user.onInsert((_ctx, u) => {
          if (identityRef.current && u.identity === identityRef.current) {
            console.log("User inserted:", u);
            setUser(u);
          }
        });

        connection.db.user.onUpdate((_ctx, _oldU, newU) => {
          if (identityRef.current && newU.identity === identityRef.current) {
            setUser(newU);
          }
        });

        connection.db.user.onDelete((_ctx, u) => {
          if (identityRef.current && u.identity === identityRef.current) {
            setUser(null);
          }
        });

        setDb(connection);
      })
      .onConnectError((_ctx, err) => {
        console.error("❌ SpacetimeDB connection error:", err);
        setIsLoading(false);
      })
      .onDisconnect((_ctx, err) => {
        if (err) {
          console.error("❌ SpacetimeDB disconnected with error:", err);
        } else {
          console.log("SpacetimeDB disconnected");
        }
        setUser(null);
        setIsLoading(false);
      })
      .build();

    return () => {
      conn.disconnect();
    };
    // Only run once on mount
  }, []);

  const logout = () => {
    identityRef.current = null;
    setUser(null);
    setIdentity(null);
    setToken(null);
    localStorage.removeItem("spacetimedb_token");
    db?.disconnect();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, token, identity, db }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Re-export db accessor that reads from context — use useAuth().db instead
