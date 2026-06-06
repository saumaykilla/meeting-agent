import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
