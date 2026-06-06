"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { clsx } from "clsx";

// ---- Icons (inline SVG for zero dependencies) ----

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function MeetingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 2.5L5 13.5M11 2.5L9.5 13.5M2.5 6h11M2 10h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 1.5h8a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 13.5C1 11 3.2 9 6 9s5 2 5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 12.5c0-1.5-1.1-2.7-2.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.5 2.5l.7.7M10.8 10.8l.7.7M2.5 11.5l.7-.7M10.8 3.2l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---- Mock data ---- (will be replaced with SpacetimeDB subscriptions)
const MOCK_USER = { id: 1, name: "Sarah Johnson", role: "Admin" as const };
const MOCK_COMPANY = { name: "Acme Corp" };
const MOCK_CHANNELS = [
  { id: 1, name: "general" },
  { id: 2, name: "engineering" },
  { id: 3, name: "design" },
];
const MOCK_DMS = [
  { id: 1, name: "James Lee", online: true },
  { id: 2, name: "Maria Chen", online: false },
];

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function NavItem({ href, icon, label, badge }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link href={href} className={clsx("nav-item", active && "active")}>
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && <span className="nav-badge">{badge}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const user = MOCK_USER;
  const company = MOCK_COMPANY;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">CC</div>
        <div className="sidebar-company">{company.name}</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {/* Primary */}
        <div className="sidebar-section">
          <NavItem href="/dashboard" icon={<HomeIcon />} label="Home" />
          <NavItem href="/meetings" icon={<MeetingsIcon />} label="Meetings" />
          <NavItem href="/summaries" icon={<SummaryIcon />} label="Summaries" />
        </div>

        <div className="divider" style={{ margin: "0 16px" }} />

        {/* Channels */}
        <div className="sidebar-section" style={{ paddingTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 16px 4px",
            }}
          >
            <span className="sidebar-section-label" style={{ padding: 0 }}>
              Channels
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px 4px", borderRadius: "var(--radius-sm)" }}
              title="Add channel"
            >
              <PlusIcon />
            </button>
          </div>
          {MOCK_CHANNELS.map((ch) => {
            const href = `/chat/${ch.id}`;
            const active = pathname === href;
            return (
              <Link
                key={ch.id}
                href={href}
                className={clsx("nav-item", active && "active")}
              >
                <HashIcon />
                <span>{ch.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="divider" style={{ margin: "0 16px" }} />

        {/* Direct Messages */}
        <div className="sidebar-section" style={{ paddingTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 16px 4px",
            }}
          >
            <span className="sidebar-section-label" style={{ padding: 0 }}>
              Direct Messages
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px 4px", borderRadius: "var(--radius-sm)" }}
              title="New DM"
            >
              <PlusIcon />
            </button>
          </div>
          {MOCK_DMS.map((dm) => {
            const href = `/chat/dm/${dm.id}`;
            const active = pathname === href;
            return (
              <Link
                key={dm.id}
                href={href}
                className={clsx("nav-item", active && "active")}
              >
                <Avatar name={dm.name} size="sm" online={dm.online} />
                <span style={{ flex: 1 }}>{dm.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {user.role === "Admin" && (
          <>
            <div className="divider" style={{ margin: "0 16px" }} />
            <div className="sidebar-section" style={{ paddingTop: 8 }}>
              <span className="sidebar-section-label">Admin</span>
              <NavItem href="/admin/employees" icon={<PeopleIcon />} label="People" />
              <NavItem href="/admin/settings" icon={<SettingsIcon />} label="Company Settings" />
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Avatar name={user.name} size="md" online />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="sidebar-footer-name">{user.name}</div>
          <div className="sidebar-footer-role">{user.role}</div>
        </div>
        <Link href="/settings/profile" className="btn btn-ghost" style={{ padding: 6 }}>
          <SettingsIcon />
        </Link>
      </div>
    </aside>
  );
}
