# 12 — Settings & Profile

**Depends on:** 04 — App Shell  
**Blocks:** Nothing (standalone)  
**Estimated effort:** Small

---

## Goal

Build the user profile settings page and the admin company settings page. These are low-complexity CRUD forms that round out the application experience.

---

## Screens Covered

| Screen | Route | Access |
|---|---|---|
| User Profile & Settings | `/settings/profile` | All users |
| Admin Company Settings | `/admin/settings` | Admin only |

> Note: Admin Company Settings was detailed in Feature 05 (Employee Management). This file covers the User Profile side only, plus any remaining settings sub-pages.

---

## User Settings — `/settings/profile`

### Layout

```
Two-column settings layout:
  Left: Settings nav (200px)
    - Profile (active)
    - Notifications
    - Security
  Right: Settings content area (white card)
```

### Profile Section

```typescript
interface ProfileFormData {
  display_name: string
  job_title?: string
  department?: string
}

// Fields:
// - Avatar: large circle with initials, "Change Photo" button (non-functional MVP — show "coming soon")
// - Display Name: editable text input
// - Email: read-only with "Verified" badge (email cannot be changed in MVP)
// - Job Title: optional free text
// - Department: optional free text
// - "Save Changes" button (charcoal primary)
```

**On save:** Call `update_user_profile(display_name, job_title, department)` reducer.

### Notification Settings Section

```typescript
// Toggle switches:
// - "Show my online status to teammates" (default: on)
// - "Receive notifications for new meeting invites" (default: on)  
// - "Receive CC Assistant meeting summary notifications" (default: on)
// - "Allow direct messages from all team members" (default: on)

// Stored in a user_preferences table or as JSON field on users table
```

### Security Section

```typescript
// Change Password form:
// - Current Password input
// - New Password input
// - Confirm New Password input
// - "Update Password" button
// On submit: hash new password, call update_password(old_hash, new_hash) reducer
// Reducer validates old password before allowing change

// Danger Zone:
// - "Leave Company" button (red outline)
// - Confirm dialog: "Are you sure? You will lose access to all CC data."
// - Blocked if user is the only admin → show error: "Transfer admin role before leaving"
```

---

## New SpacetimeDB Reducers

```rust
// Update display name, job title, department
pub fn update_user_profile(
    ctx: ReducerContext,
    display_name: String,
    job_title: Option<String>,
    department: Option<String>,
)

// Change password (validates old password first)
pub fn update_password(
    ctx: ReducerContext,
    old_password_hash: String,
    new_password_hash: String,
)

// Leave company (sets is_active = false on own account)
pub fn leave_company(ctx: ReducerContext)
```

---

## Navigation to Settings

From the sidebar footer:

```typescript
// Sidebar bottom shows: [Avatar] [Display Name] [⚙ gear icon]
// Gear icon links to /settings/profile
// User name also links to /settings/profile
// Admin badge (if admin) appears next to their name
```

---

## Settings Layout Component

```typescript
// components/layout/SettingsLayout.tsx
interface SettingsLayoutProps {
  navItems: { label: string; href: string }[]
  children: React.ReactNode
}

// Renders two-column layout:
// Left: vertical nav list (pill active state)
// Right: children (form content)
```

---

## Tasks

- [ ] Build `/settings/profile` page with profile form
- [ ] Build `SettingsLayout` two-column component
- [ ] Implement `update_user_profile` reducer in SpacetimeDB module
- [ ] Build Notification settings section with toggles
- [ ] Build Security section with change password form
- [ ] Implement `update_password` reducer (validates old hash first)
- [ ] Implement `leave_company` with admin guard check
- [ ] Add gear icon link in sidebar footer → `/settings/profile`
- [ ] Add `job_title` + `department` fields to `users` table if not already present
- [ ] Test: name change reflects immediately in sidebar (via subscription)
- [ ] Test: password change → old password still works → logs user out
- [ ] Test: admin trying to leave when sole admin → blocked with error message

---

## Notes

- Avatar photo upload is marked as "coming soon" in MVP. Show a ghost button that triggers a toast notification instead.
- The `job_title` and `department` fields on users are purely display — they do not affect permissions or routing.
- Online status preference (toggle off) simply stops the user from appearing with a green dot in other people's sidebars. Implement via a `show_online_status: bool` flag on the user record.
