# 03 — Authentication (Register, Login, Invite Flow)

**Depends on:** 02 — SpacetimeDB Module  
**Blocks:** 04 App Shell  
**Estimated effort:** Medium

---

## Goal

Implement the full authentication flow for CC:
1. **Admin registers** — creates company account + first admin user using their SpacetimeDB identity.
2. **Login** — checks the user's SpacetimeDB browser identity and automatically signs them in.
3. **Employee invite** — admin creates an invite, employee receives email link, sets up their account, linking it to their SpacetimeDB identity.

All auth state is managed via SpacetimeDB's built-in Identity and Token system + a client-side session stored in `localStorage`.

---

## Screens Covered

| Screen | Route | Role |
|---|---|---|
| Company Registration | `/register` | Admin |
| Sign In | `/login` | Both |
| Employee Account Setup | `/setup?token=xxx` | Employee |

---

## Frontend Pages

### `/register` — Company Registration

```
Components:
- RegisterForm
  - CompanyName input
  - AdminFullName input
  - WorkEmail input
  - Terms checkbox
  - Submit button → calls SpacetimeDB register_company reducer
  - Link to /login
```

**On submit:**
1. Call `register_company(company_name, admin_name, email)` reducer (uses sender identity)
2. SpacetimeDB links identity, returns state
3. Redirect to `/dashboard`
4. Redirect to `/dashboard`

---

### `/login` — Sign In

```
Components:
- LoginForm
  - Message checking identity session
  - "Start new SpacetimeDB session" button (to clear tokens if no account is found)
  - Link to /register
```

**On submit:**
1. Call `logout()` (which clears `spacetimedb_token` from `localStorage`)
2. Reloads page to generate new token

---

### `/setup?token=xxx` — Employee Account Setup

```
Components:
- SetupForm
  - Company invite banner (read from token metadata)
  - FullName input
  - Email input (read-only, pre-filled from token)
  - Submit button → calls accept_invite reducer
```

**On load:**
1. Parse `token` from URL query param
2. Call SpacetimeDB to look up invite token → get company name + email
3. Pre-fill email field (read-only)
4. Show company name in invite banner

**On submit:**
1. Call `accept_invite(token, display_name)` reducer
2. Token is invalidated server-side (set to `None` in users table)
3. Session automatically updates state via `user` table insert → redirect to `/dashboard`

---

## Auth State Hook

```typescript
// web/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Subscribe to current user from SpacetimeDB
  // Redirect to /login if no session
  
  return { user, isLoading, logout }
}
```

## Session Management

```typescript
// web/lib/auth.ts
export const SESSION_KEY = 'cc_session'

export function getSession(): SpacetimeDBSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setSession(session: SpacetimeDBSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
```

## Route Protection

```typescript
// web/app/(app)/layout.tsx
// On mount: check session, subscribe to user table
// If no valid session → redirect('/login')
// If valid session → render children with user context
```

---

## API Route — Invite Email

```typescript
// web/app/api/invite/route.ts
// POST { email, token, company_name }
// Uses Resend to send:
//   Subject: "You've been invited to join [Company] on CC"
//   Body: link to /setup?token={token}

import { Resend } from 'resend'

export async function POST(req: Request) {
  const { email, token, companyName } = await req.json()
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  await resend.emails.send({
    from: 'CC <noreply@yourapp.com>',
    to: email,
    subject: `You've been invited to join ${companyName} on CC`,
    html: `
      <p>You've been invited to join <strong>${companyName}</strong>.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/setup?token=${token}">
        Accept Invitation
      </a>
    `
  })
  
  return Response.json({ success: true })
}
```

---

## Tasks

- [ ] Build `RegisterForm` component — validation (email format, terms checked)
- [ ] Build `LoginForm` component — session check
- [ ] Build `SetupForm` component — token parsing, read-only email, invite banner
- [ ] Implement `useAuth` hook with SpacetimeDB session subscription
- [ ] Implement `getSession` / `setSession` / `clearSession` in `lib/auth.ts`
- [ ] Add route protection in `(app)/layout.tsx`
- [ ] Implement `POST /api/invite` route with Resend email sending
- [ ] Test full flow: register → dashboard, login → dashboard, invite → setup → dashboard
- [ ] Test error states: invalid password, duplicate email, expired token
- [ ] Add loading spinners to all form submit buttons

---

## Validation Rules

| Field | Rule |
|---|---|
| Company Name | Required, 2–100 chars |
| Display Name | Required, 2–60 chars |
| Email | Valid email format, unique within company |
| Invite Token | Must exist + not yet used |
