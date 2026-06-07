"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

interface SettingsLayoutProps {
  navItems: { label: string; href: string }[];
  children: React.ReactNode;
}

export function SettingsLayout({ navItems, children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px minmax(0, 1fr)",
        gap: "var(--space-6)",
        maxWidth: 980,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <nav className="card card-sm" style={{ padding: "var(--space-2)", height: "fit-content" }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={clsx("settings-nav-item", pathname === item.href && "active")}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

