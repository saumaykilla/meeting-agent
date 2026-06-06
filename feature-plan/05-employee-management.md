# 05 — Admin: Employee Management

**Depends on:** 04 — App Shell  
**Blocks:** Nothing (standalone admin feature)  
**Estimated effort:** Small-Medium

---

## Goal

Give admins full visibility and control over their company's employees. Admins can invite new employees, view their status, change roles, and remove them. This is an admin-only section.

---

## Screens Covered

| Screen | Route |
|---|---|
| Employee Management | `/admin/employees` |
| Invite Employee Modal | overlay on `/admin/employees` |
| Company Settings | `/admin/settings` |

---

## `/admin/employees` — Employee List

### Layout

```
Header:
  - Title: "People"
  - Button: "Invite Employee" (charcoal primary)

Stats Row:
  - Total Employees card
  - Active card (with green dot)
  - Pending Invites card (with amber dot)

Employee Table:
  Columns: Avatar + Name | Email | Role | Status | Joined | Actions
  
  Rows:
  - Active employee: green "Active" badge, role pill (Admin/Employee)
  - Pending employee: amber "Pending" badge, "Resend Invite" + "Revoke" actions
  
Actions per row:
  - Active: [Edit Role ▼] [Remove]
  - Pending: [Resend Invite] [Revoke]
```

### Data source

```typescript
// Subscribe to all users in the company
client.subscribe('SELECT * FROM users WHERE company_id = ?', [companyId])

// Filter:
// active = user.invite_token === null && user.is_active === true
// pending = user.invite_token !== null
```

---

## Invite Employee Modal

Triggered by "Invite Employee" button.

```typescript
interface InviteFormData {
  email: string
  role: 'Admin' | 'Employee'
}
```

**Flow:**
1. Admin fills email + role dropdown
2. On submit:
   a. Call `create_invite(email, role)` reducer → returns token string
   b. Call `POST /api/invite` with `{ email, token, companyName }`
   c. Email sent via Resend
   d. Invite appears in pending list immediately (SpacetimeDB subscription fires)
3. Close modal + show success toast "Invite sent to {email}"

**Error states:**
- Email already exists in company → "This person is already a member"
- Email already has pending invite → "An invite is already pending for this email"

---

## Role Change

```typescript
// Dropdown on each row: Admin | Employee
// On change: call update_user_role(userId, newRole) reducer
// Confirm dialog for: demoting yourself (admin → employee) — blocked if only admin
```

---

## Remove Employee

```typescript
// Clicking Remove shows confirm modal:
// "Remove James Lee? They will lose access to all CC data immediately."
// Confirm → call remove_user(userId) reducer
// Sets is_active = false (soft delete)
```

---

## Resend Invite

```typescript
// Clicking "Resend Invite" on a pending employee:
// 1. Call regenerate_invite_token(userId) reducer → new token
// 2. Call POST /api/invite again with new token
// 3. Toast: "Invite resent to {email}"
```

---

## `/admin/settings` — Company Settings

### Sections

**Company Profile:**
- Company Name (editable text input)
- Company Logo (file upload — stored as base64 or URL in companies table)
- Industry dropdown
- "Save Changes" button

**CC Assistant Settings:**
- Toggle: "CC Assistant joins all meetings automatically" (default: on)
- Toggle: "Post meeting summaries to meeting thread" (default: on)  
- Toggle: "Notify team when repeated topic detected" (default: on)
- Topic sensitivity: Low | Medium | High segmented control
- Read-only stat: "X meetings indexed in company knowledge base"
- Link: "View all summaries →"

**Danger Zone:**
- "Delete Company Account" button (red outline)
- Confirm modal required

### Data source

```typescript
// company settings stored in companies table
// CC Assistant settings can be a new table or JSON field:

Table: company_settings
  company_id: u64 (PK)
  agent_auto_join: bool
  post_summaries: bool
  notify_repeated_topics: bool
  topic_sensitivity: Enum { Low, Medium, High }
```

---

## New SpacetimeDB Reducers Needed

```rust
// In addition to create_invite / accept_invite from feature 03:
pub fn regenerate_invite_token(ctx: ReducerContext, user_id: u64) -> String
pub fn update_user_role(ctx: ReducerContext, user_id: u64, new_role: UserRole)
pub fn remove_user(ctx: ReducerContext, user_id: u64)  // sets is_active = false
pub fn update_company_settings(ctx: ReducerContext, settings: CompanySettings)
pub fn update_company_name(ctx: ReducerContext, name: String)
```

---

## Tasks

- [ ] Build `/admin/employees` page with stats cards + employee table
- [ ] Build `InviteEmployeeModal` component with email/role form
- [ ] Wire invite flow: reducer → API route → email → toast feedback
- [ ] Implement role change dropdown with confirm for self-demotion guard
- [ ] Implement "Remove Employee" with confirm modal
- [ ] Implement "Resend Invite" + "Revoke Invite" for pending employees
- [ ] Build `/admin/settings` page with all three sections
- [ ] Add `company_settings` table + `update_company_settings` reducer to SpacetimeDB module
- [ ] Guard all `/admin/*` routes — redirect non-admins to `/dashboard`
- [ ] Build guard in `AppShell`: hide "People" nav item for non-admins
- [ ] Test: admin can't remove themselves if they're the only admin
- [ ] Test: pending user trying to log in before accepting invite shows helpful error
