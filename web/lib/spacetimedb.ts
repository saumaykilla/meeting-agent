// SpacetimeDB connection config — the actual connection is created in AuthProvider
// to properly handle onConnect callbacks and token management.

export const SPACETIMEDB_URI =
  process.env.NEXT_PUBLIC_SPACETIMEDB_URI || "https://maincloud.spacetimedb.com";

export const SPACETIMEDB_MODULE =
  process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "cc-hackathon-db";
