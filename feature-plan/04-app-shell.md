# 04 — App Shell & Navigation

**Depends on:** 03 — Authentication  
**Blocks:** 05, 06, 07, 12  
**Estimated effort:** Small-Medium

---

## Goal

Build the persistent application shell that wraps all authenticated pages. This includes the sidebar navigation, top bar, and the layout system. Every screen after login lives inside this shell.

---

## Screens Covered

The shell is the container for all `(app)/` routes. It renders:
- Sidebar (always visible)
- Main content area (child page renders here)

---

## Shell Layout

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content Area               │
│                   │                                  │
│  CC               │  [page-specific content]         │
│  Acme Corp        │                                  │
│  ─────────────    │                                  │
│  🏠 Home          │                                  │
│  📅 Meetings      │                                  │
│  # Channels       │                                  │
│    └ #general     │                                  │
│    └ #engineering │                                  │
│    └ + Add        │                                  │
│  💬 Direct Msgs   │                                  │
│    └ Sarah J.     │                                  │
│    └ James L.     │                                  │
│  📋 Summaries     │                                  │
│  👥 People        │  (Admin only)                   │
│  ─────────────    │                                  │
│  [Avatar] James   │                                  │
│  Settings gear    │                                  │
└──────────────────────────────────────────────────────┘
```

---

## Components

### `components/layout/Sidebar.tsx`

```typescript
interface SidebarProps {
  user: User
  company: Company
  channels: Channel[]
  dmConversations: DmConversation[]
  unreadCounts: Record<string, number>
}
```

**Sidebar sections:**
1. **Brand** — `CC` wordmark + company name below
2. **Primary nav** — Home, Meetings, Summaries
3. **Channels** — collapsible, list of `#channel-name` links, `+ Add Channel` button
4. **Direct Messages** — list of DM partners with online indicator dot, `+ New Message` button
5. **People** — shown only if `user.role === 'Admin'`
6. **Footer** — avatar + display name + settings gear icon

**Active state:** Violet left border `4px` + charcoal text. Inactive: `#8A8680` muted text.

---

### `components/layout/AppShell.tsx`

```typescript
// web/app/(app)/layout.tsx
export default async function AppLayout({ children }) {
  // Server component — validate session
  // Pass user, company, channels, DMs to sidebar via context
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-surface)' }}>
        {children}
      </main>
    </div>
  )
}
```

---

### `components/layout/PageHeader.tsx`

```typescript
// Reusable top bar for all inner pages
interface PageHeaderProps {
  title: string
  action?: React.ReactNode  // e.g. "New Meeting" button
  backHref?: string         // show back arrow if provided
}
```

---

## SpacetimeDB Subscriptions in Shell

The shell subscribes to the following tables on mount (company-scoped):

```typescript
// web/lib/spacetimedb.ts
client.subscribe([
  'SELECT * FROM channels WHERE company_id = ?',
  'SELECT * FROM channel_members WHERE user_id = ?',
  'SELECT * FROM dm_conversations WHERE user_a_id = ? OR user_b_id = ?',
  'SELECT * FROM users WHERE company_id = ?',
  'SELECT * FROM meetings WHERE company_id = ?',
])
```

This ensures sidebar counts, online indicators, and channel lists are always live.

---

## Context Provider

```typescript
// web/lib/context/AppContext.tsx
interface AppContextValue {
  user: User
  company: Company
  channels: Channel[]
  members: User[]           // all company users
  dmConversations: DmConversation[]
  onlineMemberIds: Set<number>
}

export const AppContext = createContext<AppContextValue>(null!)
export function useApp() { return useContext(AppContext) }
```

---

## CSS — Sidebar Styles

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-card);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 14px;
  color: var(--color-muted);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.1s;
}

.nav-item.active {
  color: var(--color-primary);
  border-left-color: var(--color-accent);
  background: rgba(124, 92, 252, 0.04);
}

.nav-item:hover:not(.active) {
  color: var(--color-primary);
  background: var(--color-surface);
}
```

---

## Tasks

- [ ] Build `Sidebar` component with all sections (brand, nav, channels, DMs, people, footer)
- [ ] Implement active link detection using `usePathname()`
- [ ] Build `AppShell` layout that wraps all `(app)/` routes
- [ ] Build `PageHeader` reusable component
- [ ] Create `AppContext` provider — mount SpacetimeDB subscriptions for channels, users, DMs
- [ ] Implement admin-only gating for the 'People' nav item
- [ ] Add online presence indicator dots (green = connected to SpacetimeDB session)
- [ ] Implement `+ Add Channel` modal (inline, simple — just a name input)
- [ ] Implement `+ New Message` flow — user picker modal → opens DM thread
- [ ] Add unread badge counts on sidebar items
- [ ] Ensure sidebar is scrollable when many channels/DMs exist
- [ ] Test responsive behavior at 1280px and 1440px widths

---

## UI Primitives to Build (used everywhere)

These should be built as part of this feature since all subsequent features depend on them:

| Component | Description |
|---|---|
| `Button` | `variant: primary \| secondary \| accent \| danger`, `size: sm \| md` |
| `Input` | text input with label, error state, icon support |
| `Card` | white card with border, optional left accent bar |
| `Badge` | pill badge, variants: default, success, warning, danger, agent (violet) |
| `Avatar` | circle with initials + gradient fallback, `size: sm \| md \| lg`, online dot |
| `Modal` | overlay + centered card, close button, `children` slot |
| `Spinner` | loading spinner for async states |
| `Toast` | ephemeral notifications (success, error) |
