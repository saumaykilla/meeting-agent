import { Suspense } from "react";
import SetupForm from "./SetupForm";

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="spinner spinner-lg" />
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
              Verifying invite link...
            </p>
          </div>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
