# 08 — LiveKit Video Room

**Depends on:** 07 — Meetings (for room name + token)  
**Blocks:** 09 — LiveKit Agent  
**Estimated effort:** Medium

---

## Goal

Build the full live meeting room experience using LiveKit. This includes the video grid, screen sharing, in-meeting live chat sidebar, participant list, and all meeting controls. The room is a full-screen overlay (no sidebar shell).

---

## Screen Covered

| Screen | Route |
|---|---|
| Live Meeting Room | `/meetings/[id]/room` |

---

## Architecture

```
User navigates to /meetings/[id]/room
  ↓
Fetch LiveKit token from /api/livekit/token
  ↓
Connect to LiveKit room (wss://livekit-server)
  ↓
LiveKit room renders:
  - Local participant video/audio
  - Remote participant tracks
  - CC Assistant bot participant (audio only + special UI tile)
  ↓
On room disconnect:
  - Navigate back to /meetings/[id] (which now shows the ended state)
```

---

## Pre-Join Lobby — `/meetings/[id]`

Before entering the full room, show a camera preview:

```typescript
// Use getUserMedia to show local camera preview
// Allow toggling mic/camera before joining
// Store mic/camera enabled state in localStorage as preference

interface PreJoinState {
  micEnabled: boolean
  cameraEnabled: boolean
  localStream: MediaStream | null
}
```

The lobby page (covered in Feature 07) links to `/meetings/[id]/room` on "Join Meeting" click.

---

## Room Page — `/meetings/[id]/room`

### Token Fetch

```typescript
// web/app/(app)/meetings/[id]/room/page.tsx
// On mount:
const res = await fetch('/api/livekit/token', {
  method: 'POST',
  body: JSON.stringify({
    roomName: meeting.livekit_room_name,
    participantName: user.display_name,
    participantId: user.id,
  })
})
const { token } = await res.json()
```

### Room Connection

```typescript
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'

<LiveKitRoom
  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
  token={token}
  connect={true}
  onDisconnected={handleDisconnect}
>
  <CCMeetingRoom meetingId={meetingId} />
</LiveKitRoom>
```

### `CCMeetingRoom` — Custom Room Layout

Instead of the default `VideoConference` component, build a custom layout:

```
┌──────────────────────────────────────────────────────┐
│ Top Bar (dark)                                       │
│  [Title + timer] [CC Listening indicator] [End btn] │
├──────────────────────────┬───────────────────────────┤
│                          │                           │
│   Video Grid (75%)       │   Right Panel (25%)       │
│                          │                           │
│  ┌────┐ ┌────┐          │  Tabs: Chat | Participants│
│  │    │ │    │          │                           │
│  │ SJ │ │ JL │          │  [Messages]               │
│  └────┘ └────┘          │                           │
│  ┌────┐ ┌────┐          │  [Input]                  │
│  │    │ │ CC │          │                           │
│  │ MC │ │ 🤖 │          │                           │
│  └────┘ └────┘          │                           │
│                          │                           │
├──────────────────────────┴───────────────────────────┤
│ Bottom Toolbar (dark)                                │
│  [Mic] [Cam] [Screen] [Reactions] [More] [Leave]    │
└──────────────────────────────────────────────────────┘
```

---

## Components

### `VideoGrid.tsx`

```typescript
import { useTracks, TrackLoop, VideoTrack } from '@livekit/components-react'
import { Track } from 'livekit-client'

// Renders a CSS grid of participant video tiles
// 1 person: full width
// 2-4 people: 2x2 grid
// 5+ people: 3-col grid with scroll

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare])
  return (
    <div className="video-grid">
      <TrackLoop tracks={tracks}>
        <ParticipantTile />
      </TrackLoop>
    </div>
  )
}
```

### `ParticipantTile.tsx`

```typescript
// Each video tile:
// - Shows VideoTrack or Avatar fallback (when cam off)
// - Name label bottom-left (white text)
// - Mic muted indicator (red mic-slash icon, top-right)
// - Active speaker: violet border glow (4px)
// - CC Assistant: special violet tile with CC logo + "Listening" label

// Detect CC Assistant: participant.identity starts with "cc-agent-"
function ParticipantTile({ trackRef }) {
  const participant = trackRef.participant
  const isAgent = participant.identity.startsWith('cc-agent-')
  
  if (isAgent) return <AgentTile />
  return <HumanTile trackRef={trackRef} />
}
```

### `AgentTile.tsx`

```typescript
// Special tile for CC Assistant:
// - Violet (#7C5CFC) background
// - CC logo (text "CC" in white, bold)
// - "CC Assistant" label
// - Pulsing dot animation when speaking/active
// - "Listening" text when not speaking
```

### `MeetingControls.tsx`

```typescript
import { 
  useLocalParticipant, 
  useRoomContext,
  TrackToggle 
} from '@livekit/components-react'

// Bottom toolbar buttons:
// 1. Mic toggle (TrackToggle source=Microphone)
// 2. Camera toggle (TrackToggle source=Camera)
// 3. Screen share (TrackToggle source=ScreenShare)
// 4. Reactions (emoji picker — post to meeting chat in sidebar)
// 5. More (dots menu → settings, background, etc. — MVP: basic)
// 6. Leave button → room.disconnect() → navigate back
```

### `MeetingRightPanel.tsx`

```typescript
// Two tabs: Chat | Participants

// Chat tab:
//   - Same MessageList + MessageInput as Feature 06
//   - But subscribed to MeetingThread messages for this meeting_id
//   - CC Assistant messages have violet styling

// Participants tab:
//   - List of everyone in the LiveKit room
//   - Avatar + name + role indicator
//   - CC Assistant listed as "CC Assistant — AI"
//   - Muted indicator, video-off indicator

function MeetingRightPanel({ meetingId }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat')
  return (
    <div className="right-panel">
      <PanelTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'chat' && <MeetingChat meetingId={meetingId} />}
      {activeTab === 'participants' && <ParticipantsList />}
    </div>
  )
}
```

### `MeetingTopBar.tsx`

```typescript
// Dark top bar:
// - Left: meeting title + live timer (elapsed since started_at)
// - Center: "● CC is listening" with pulsing violet dot
//           (hidden if agent not present in room)
// - Right: "End Meeting" button (red, Admin only) or "Leave" link

// Live timer:
const [elapsed, setElapsed] = useState(0)
useEffect(() => {
  const interval = setInterval(() => {
    setElapsed(Date.now() - meeting.started_at.getTime())
  }, 1000)
  return () => clearInterval(interval)
}, [meeting.started_at])
```

---

## LiveKit Webhook Handler

```typescript
// web/app/api/livekit/webhook/route.ts
import { WebhookReceiver } from 'livekit-server-sdk'

export async function POST(req: Request) {
  const body = await req.text()
  const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  )
  
  const event = await receiver.receive(body, req.headers.get('Authorization')!)
  
  switch (event.event) {
    case 'room_started':
      // Call start_meeting reducer in SpacetimeDB
      // Parse meeting_id from room_name: "cc-{company_id}-{meeting_id}"
      await callSpacetimeReducer('start_meeting', [meetingId])
      break
      
    case 'room_finished':
      // Call end_meeting reducer
      await callSpacetimeReducer('end_meeting', [meetingId])
      // The Python agent handles summary generation — it listens to this same webhook
      break
  }
  
  return new Response('OK')
}
```

---

## CSS — Dark Room Styles

```css
.meeting-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #111;
}

.video-grid {
  flex: 1;
  display: grid;
  gap: 4px;
  padding: 8px;
  /* Grid columns set dynamically based on participant count */
}

.participant-tile {
  position: relative;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
}

.participant-tile.active-speaker {
  border-color: var(--color-accent); /* violet glow */
}

.right-panel {
  width: 300px;
  background: #fff;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.bottom-toolbar {
  height: 72px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
```

---

## Tasks

- [ ] Set up LiveKit Cloud account + get API key/secret
- [ ] Configure LiveKit webhook endpoint in LiveKit Cloud dashboard → `/api/livekit/webhook`
- [ ] Build room page with token fetch + LiveKit connection
- [ ] Build `VideoGrid` using `useTracks` + `TrackLoop`
- [ ] Build `ParticipantTile` with video track, mic indicator, active speaker glow
- [ ] Build `AgentTile` for CC Assistant (violet tile + pulse animation)
- [ ] Build `MeetingControls` toolbar (mic, camera, screen share, leave)
- [ ] Build `MeetingRightPanel` with Chat + Participants tabs
- [ ] Build `MeetingTopBar` with title, timer, CC listening indicator
- [ ] Wire `MeetingChat` to SpacetimeDB MeetingThread subscription
- [ ] Implement `room_started` webhook → `start_meeting` reducer call
- [ ] Implement `room_finished` webhook → `end_meeting` reducer call
- [ ] Handle disconnect: on `room.disconnect()` → navigate to `/meetings/[id]`
- [ ] Handle "End Meeting" (admin only): calls `room.disconnect()` + marks all remote participants disconnected
- [ ] Test: screen sharing activates and shows as a separate track tile
- [ ] Test: participant joins mid-meeting → appears in grid immediately
- [ ] Test: CC Assistant bot appears as "CC Assistant" tile in grid

---

## Notes

- Import LiveKit CSS: `import '@livekit/components-styles'` — then override with CC dark theme styles
- The `room_name` format `cc-{company_id}-{meeting_id}` lets the webhook parse meeting/company IDs without extra lookup
- Screen sharing creates a new track tile — handle it by adding it to the grid as a large "pinned" tile at the top
- Active speaker detection: LiveKit provides `useIsSpeaking()` hook per participant
