# 07 — Meetings: Scheduling & Management

**Depends on:** 04 — App Shell  
**Blocks:** 08 — LiveKit Video Room  
**Estimated effort:** Medium

---

## Goal

Build the full meeting lifecycle on the frontend — scheduling, listing, managing, and navigating to meetings. This feature covers everything EXCEPT the actual live video room (that's Feature 08) and the agent (Feature 09).

---

## Screens Covered

| Screen | Route |
|---|---|
| Dashboard / Home | `/dashboard` |
| Meetings List | `/meetings` |
| Schedule New Meeting | `/meetings/new` |
| Meeting Detail / Pre-Join Lobby | `/meetings/[id]` |

---

## Dashboard — `/dashboard`

The first page after login. Aggregates key info for the user.

### Sections

**For Admin (`role === 'Admin'`):**
```
Good morning, {name}
─────────────────────────────────
[Today's Meetings]  [Upcoming]  [Team Summaries]

Today's Meetings (cards, horizontal scroll):
  - Meeting card: title, time, participant count, "Join" button (violet, active when meeting.status === 'Active')

Recent Summaries (last 3):
  - Summary card: meeting name, date, 2-line preview, "View →"

Team Activity Feed:
  - "Sarah posted in #general" — 5m ago
  - "CC Assistant summarized Q3 Planning" — 1h ago
  - "Tom scheduled a new meeting" — 2h ago
```

**For Employee:**
```
Good morning, {name}

Quick stats: next meeting in X, unread messages count, total summaries
Upcoming Meetings (same card layout)
Recent Activity Feed
CC Assistant Memory card (violet tinted):
  "CC has indexed X meetings in your company's memory"
```

---

## Meetings List — `/meetings`

### Layout

```
Header: "Meetings" title + "Schedule Meeting" button

Tabs: Upcoming | Past | My Meetings

Meeting cards (vertical list):
  Each card (white, border, 8px radius):
    Left: Date block (e.g. "JUN 10" in charcoal bold)
    Content: Title | Time range | Participant avatars | Channel tag
    Right: Status badge + action buttons
  
  Status badges:
    Scheduled → grey pill "Scheduled"
    Active → green pulse dot + "Live Now"
    Ended → muted "Ended"
  
  Action buttons:
    Scheduled: "Join" (disabled, violet) + 3-dot menu (Edit, Cancel)
    Active: "Join Now" (violet, enabled)
    Ended: "View Summary" link
```

### SpacetimeDB Subscription

```typescript
client.subscribe(
  'SELECT * FROM meetings WHERE company_id = ?',
  [companyId]
)
client.subscribe(
  'SELECT * FROM meeting_participants WHERE meeting_id IN (?)',
  [meetingIds]
)
```

### Tabs filtering

```typescript
const upcoming = meetings.filter(m => m.status === 'Scheduled' && m.scheduledAt > now)
const past = meetings.filter(m => m.status === 'Ended')
const mine = meetings.filter(m => myParticipantMeetingIds.includes(m.id))
```

---

## Schedule New Meeting — `/meetings/new`

### Form

```typescript
interface NewMeetingForm {
  title: string               // required
  description?: string        // optional
  scheduledAt: Date           // date + time picker
  duration: number            // minutes: 30 | 45 | 60 | 90 | 120
  participantIds: number[]    // selected from company users
}
```

### Participant Picker

```typescript
// Search input → filter company users by name/email
// Selected users shown as dismissible chips (avatar + name + X)
// Suggestions dropdown below input showing unselected users
// Current user is auto-added and cannot be removed
```

### CC Assistant Toggle

```typescript
// Toggle (on by default, respects company_settings.agent_auto_join)
// Label: "CC Assistant will join and generate a summary"
// When off: agent will NOT join this meeting (stored on meeting record)

// Add `agent_enabled: bool` to meetings table
```

### Submit

```typescript
async function scheduleMeeting(data: NewMeetingForm) {
  const meetingId = await client.callReducer('create_meeting', [
    data.title,
    data.description,
    data.scheduledAt.toISOString(),
    data.participantIds,
    data.agentEnabled,
  ])
  router.push(`/meetings/${meetingId}`)
}
```

---

## Meeting Detail / Pre-Join Lobby — `/meetings/[id]`

This page serves two states:

### State A: Meeting not yet started (Scheduled)

```
White card layout (no sidebar override):
  - Meeting title
  - Date/time + "Starts in X minutes" countdown
  - Host name
  - Participant list with avatars
  - "CC Assistant will join automatically" info box (violet tinted)
  - "Join Meeting" button (disabled, active at scheduled time - 5 min)
  - "Edit Meeting" (if creator) | "Leave Meeting" (if not creator)
```

### State B: Meeting is Active

```
Same layout but:
  - "Join Meeting" button is violet + enabled
  - Shows "X participants in the call" with green dots
  - Clicking Join → navigates to /meetings/[id]/room
```

### State C: Meeting Ended

```
  - Shows "This meeting has ended"
  - "View Summary →" link if summary exists
  - Meeting duration shown
```

---

## LiveKit Room Name Generation

When a meeting is created, the reducer generates a unique `livekit_room_name`:

```rust
// In create_meeting reducer:
let room_name = format!("cc-{}-{}", company_id, meeting_id);
```

This is what the frontend passes to the LiveKit token API.

---

## API Route — LiveKit Token

```typescript
// web/app/api/livekit/token/route.ts
import { AccessToken } from 'livekit-server-sdk'

export async function POST(req: Request) {
  const { roomName, participantName, participantId } = await req.json()
  
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: String(participantId), name: participantName }
  )
  
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })
  
  return Response.json({ token: await token.toJwt() })
}
```

---

## Tasks

- [ ] Build `/dashboard` page with upcoming meetings section + recent summaries + activity feed
- [ ] Build `/meetings` list page with Upcoming/Past/My tabs + meeting cards
- [ ] Build `/meetings/new` page with full form: title, date/time, duration, participants picker, CC toggle
- [ ] Build `/meetings/[id]` lobby page with 3 state rendering (scheduled, active, ended)
- [ ] Implement "Schedule Meeting" → reducer call → redirect to meeting detail
- [ ] Implement participant picker component (search + chips)
- [ ] Implement LiveKit token API route (`/api/livekit/token`)
- [ ] Add meeting countdown timer on lobby page (updates every second)
- [ ] Add "Join Now" button enabling logic (activates when meeting is in 'Active' state)
- [ ] Subscribe to meeting status changes — lobby page auto-updates when status flips to 'Active'
- [ ] Implement "Cancel Meeting" with confirm modal
- [ ] Add `agent_enabled` field to meetings table + toggle in create form
- [ ] Handle empty states: "No upcoming meetings — schedule one!" 
- [ ] Test: meeting card shows correct status badge for all 3 states
- [ ] Test: participant count updates in real-time as users join

---

## Notes

- The `livekit_room_name` must be deterministic and stored in SpacetimeDB — never generate it client-side.
- Meeting times are stored as UTC timestamps. Display uses `toLocaleString()` in the user's browser timezone.
- The "Join Meeting" button on the lobby should work for both scheduled and active meetings to prevent confusion — just enable at the right time.
