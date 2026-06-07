"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!isLoading && user?.mustResetPassword) {
      router.push("/setup");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (/^\/meetings\/[^/]+\/room$/.test(pathname)) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="mobile-topbar">
          <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div className="sidebar-brand-name">CC</div>
        </div>
        <Sidebar onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
        <main className="app-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
