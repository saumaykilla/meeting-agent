"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { clsx } from "clsx";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { Channel, Company, DmConversation, User } from "@/lib/spacetimedb-types/types";
import { AddChannelModal } from "@/components/chat/AddChannelModal";
import { AddDmModal } from "@/components/chat/AddDmModal";

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

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ href, icon, label, badge, onClick }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link href={href} className={clsx("nav-item", active && "active")} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && <span className="nav-badge">{badge}</span>}
    </Link>
  );
}

type ResolvedDm = {
  dm: DmConversation;
  otherUser: User | null;
};

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, db, logout } = useAuth();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<ResolvedDm[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddDm, setShowAddDm] = useState(false);

  useEffect(() => {
    if (!user || !db) return;

    const updateCompany = () => {
      let foundCompany = null;
      for (const c of db.db.company.iter()) {
        if (c.id === user.companyId) {
          foundCompany = c;
          break;
        }
      }
      setCompany(foundCompany);
    };

    updateCompany();

    const updateChannels = () => {
      const allChannels = Array.from(db.db.channel.iter()).filter(c => c.companyId === user.companyId);
      setChannels(allChannels);
    };
    
    const updateDms = () => {
      const allDms = Array.from(db.db.dmConversation.iter()).filter(d => 
        d.userAId === user.id || d.userBId === user.id
      );
      
      const resolved = allDms.map(dm => {
        const otherId = dm.userAId === user.id ? dm.userBId : dm.userAId;
        let otherUser: User | null = null;
        for (const u of db.db.user.iter()) {
          if (u.id === otherId) {
            otherUser = u;
            break;
          }
        }
        return { dm, otherUser };
      });
      setDms(resolved);
    };

    const updateUnreadCounts = () => {
      const nextCounts: Record<string, number> = {};
      for (const message of db.db.message.iter()) {
        if (message.companyId !== user.companyId || message.senderId === user.id) continue;
        const key = `${message.channelType}_${message.channelId.toString()}`;
        const lastSeen = BigInt(localStorage.getItem(`cc_last_seen_${message.channelType}_${message.channelId.toString()}`) || "0");
        if (message.id > lastSeen) {
          nextCounts[key] = (nextCounts[key] || 0) + 1;
        }
      }
      setUnreadCounts(nextCounts);
    };

    updateChannels();
    updateDms();
    updateUnreadCounts();

    // Subscribe to changes
    db.db.channel.onInsert(updateChannels);
    db.db.channel.onUpdate(updateChannels);
    db.db.channel.onDelete(updateChannels);

    db.db.company.onInsert(updateCompany);
    db.db.company.onUpdate(updateCompany);
    db.db.company.onDelete(updateCompany);

    db.db.dmConversation.onInsert(updateDms);
    db.db.dmConversation.onUpdate(updateDms);
    db.db.dmConversation.onDelete(updateDms);
    
    db.db.user.onInsert(updateDms);
    db.db.user.onUpdate(updateDms);
    db.db.user.onDelete(updateDms);

    db.db.message.onInsert(updateUnreadCounts);
    db.db.message.onUpdate(updateUnreadCounts);
    db.db.message.onDelete(updateUnreadCounts);
    window.addEventListener("cc:read-state-change", updateUnreadCounts);

    return () => {
      db.db.channel.removeOnInsert(updateChannels);
      db.db.channel.removeOnUpdate(updateChannels);
      db.db.channel.removeOnDelete(updateChannels);
      db.db.company.removeOnInsert(updateCompany);
      db.db.company.removeOnUpdate(updateCompany);
      db.db.company.removeOnDelete(updateCompany);
      db.db.dmConversation.removeOnInsert(updateDms);
      db.db.dmConversation.removeOnUpdate(updateDms);
      db.db.dmConversation.removeOnDelete(updateDms);
      db.db.user.removeOnInsert(updateDms);
      db.db.user.removeOnUpdate(updateDms);
      db.db.user.removeOnDelete(updateDms);
      db.db.message.removeOnInsert(updateUnreadCounts);
      db.db.message.removeOnUpdate(updateUnreadCounts);
      db.db.message.removeOnDelete(updateUnreadCounts);
      window.removeEventListener("cc:read-state-change", updateUnreadCounts);
    };

  }, [user, db]);

  if (!user || !company) return null;

  return (
    <>
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
            <NavItem href="/dashboard" icon={<HomeIcon />} label="Home" onClick={onClose} />
            <NavItem href="/meetings" icon={<MeetingsIcon />} label="Meetings" onClick={onClose} />
            <NavItem href="/summaries" icon={<SummaryIcon />} label="Summaries" onClick={onClose} />
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
                onClick={() => setShowAddChannel(true)}
              >
                <PlusIcon />
              </button>
            </div>
            {channels.map((ch) => {
              const href = `/chat/${ch.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={ch.id.toString()}
                  href={href}
                  className={clsx("nav-item", active && "active")}
                  onClick={onClose}
                >
                  <HashIcon />
                  <span>{ch.name}</span>
                  {unreadCounts[`Channel_${ch.id.toString()}`] > 0 && (
                    <span className="nav-badge">{unreadCounts[`Channel_${ch.id.toString()}`]}</span>
                  )}
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
                onClick={() => setShowAddDm(true)}
              >
                <PlusIcon />
              </button>
            </div>
            {dms.map(({ dm, otherUser }) => {
              const otherId = dm.userAId === user.id ? dm.userBId : dm.userAId;
              const href = `/chat/dm/${otherId}`;
              const active = pathname === href;
              const name = otherUser ? otherUser.displayName : "Unknown User";
              return (
                <Link
                  key={dm.id.toString()}
                  href={href}
                  className={clsx("nav-item", active && "active")}
                  onClick={onClose}
                >
                  <Avatar name={name} size="sm" online={otherUser?.isActive ?? false} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                  {unreadCounts[`DirectMessage_${dm.id.toString()}`] > 0 && (
                    <span className="nav-badge">{unreadCounts[`DirectMessage_${dm.id.toString()}`]}</span>
                  )}
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
                <NavItem href="/admin/employees" icon={<PeopleIcon />} label="People" onClick={onClose} />
                <NavItem href="/admin/settings" icon={<SettingsIcon />} label="Company Settings" onClick={onClose} />
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Avatar name={user.displayName} size="md" online />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div className="sidebar-footer-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName}
            </div>
            <div className="sidebar-footer-role">{user.role}</div>
          </div>
          <Link href="/settings/profile" className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose}>
            <SettingsIcon />
          </Link>
          <button className="btn btn-ghost text-danger" style={{ padding: 6 }} onClick={() => { onClose?.(); logout(); }} title="Sign Out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {showAddChannel && <AddChannelModal onClose={() => setShowAddChannel(false)} />}
      {showAddDm && <AddDmModal onClose={() => setShowAddDm(false)} />}
    </>
  );
}
