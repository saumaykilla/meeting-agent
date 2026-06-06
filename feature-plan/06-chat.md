# 06 — Real-time Chat (Channels + Direct Messages)

**Depends on:** 04 — App Shell  
**Blocks:** Nothing (standalone feature)  
**Estimated effort:** Medium

---

## Goal

Build the full Teams-like chat experience — channel messaging and 1:1 DMs. All messages are real-time via SpacetimeDB subscriptions. The CC Assistant also posts meeting summaries into meeting threads, which appear using the same message system.

---

## Screens Covered

| Screen | Route |
|---|---|
| Channel Chat | `/chat/[channelId]` |
| Direct Message Thread | `/chat/dm/[userId]` |

---

## Data Model (from Feature 02)

```typescript
// Messages are polymorphic — one table for all types
type ChannelType = 'Channel' | 'DirectMessage' | 'MeetingThread'

interface Message {
  id: number
  companyId: number
  senderId: number       // 0 = CC Assistant
  content: string
  sentAt: Date
  channelType: ChannelType
  channelId: number      // references Channel, DmConversation, or Meeting
  isAgentMessage: boolean
}
```

---

## Channel Chat — `/chat/[channelId]`

### Layout (3 zones)

```
[Sidebar] | [Message Area] | (no right panel)

Top bar:
  - #channel-name in bold
  - Member count + description
  - Search icon

Message area (scrollable, #F9F8F6 bg):
  - Grouped by sender (collapse consecutive messages from same person)
  - Date dividers: "Today", "Yesterday", "Jun 5"
  - CC Assistant messages: violet left border, #F5F3FF bg

Bottom:
  - MessageInput component
```

### SpacetimeDB Subscription

```typescript
// Subscribe to messages for this channel
client.subscribe(
  'SELECT * FROM messages WHERE channel_type = ? AND channel_id = ? AND company_id = ?',
  ['Channel', channelId, companyId]
)
```

Messages arrive in real-time as new rows are inserted by any user calling `send_message`.

---

## Direct Messages — `/chat/dm/[userId]`

### Layout

```
[Sidebar: DMs list] | [DM Thread]

Top bar:
  - Avatar + display name + online dot
  - Video call icon (launches a quick meeting — future feature, show disabled in MVP)

Message area:
  - Your messages: right-aligned, charcoal bubble
  - Their messages: left-aligned, plain text with avatar

Bottom:
  - MessageInput component
```

### Open DM Flow

```typescript
// When user clicks a person in the DMs sidebar:
// 1. Call open_dm(otherUserId) reducer
//    → reducer finds or creates a dm_conversations row
//    → returns conversation_id
// 2. Navigate to /chat/dm/[userId]?conversationId=[id]
// 3. Subscribe to messages for that conversation_id
```

---

## Components

### `MessageInput.tsx`

```typescript
interface MessageInputProps {
  placeholder: string           // e.g. "Message #general"
  onSend: (content: string) => void
}

// Features:
// - Controlled textarea that grows with content (max 5 lines)
// - Send on Enter (Shift+Enter for newline)
// - Emoji picker button (basic browser emoji keyboard)
// - Attachment button (non-functional in MVP — show "coming soon" toast)
// - Send button (activated when content not empty)
// - Character limit: 4000 chars
```

### `MessageList.tsx`

```typescript
// Virtualized list for performance (react-virtual or simple scroll)
// Groups messages by sender + time proximity (< 5 min = collapsed)
// Shows timestamp on hover for collapsed messages
// Auto-scrolls to bottom on new messages
// Keeps scroll position if user scrolled up (don't force scroll)
// Date dividers between days
```

### `MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: Message
  sender: User | null     // null for CC Assistant
  showAvatar: boolean     // false for consecutive messages from same sender
  isOwn: boolean          // true if message.senderId === currentUser.id
}
```

**Regular message:**
- Avatar (left) + name + timestamp + content
- Hover: show action row (emoji react, copy — MVP can skip reactions)

**CC Assistant message:**
```
┌─────────────────────────────────┐
│ violet left border (4px)        │
│ bg: #F5F3FF                     │
│                                 │
│ ◉ CC Assistant  11:05 AM        │
│                                 │
│ Q3 Planning Session Summary     │
│ Jun 10 · 62 min · 5 participants│
│                                 │
│ The team discussed Q3 goals...  │
│ [View Full Summary →]           │
└─────────────────────────────────┘
```

### `AgentMessageCard.tsx`

Specialized renderer for `isAgentMessage === true` messages that contain meeting summaries.

```typescript
// Detect if message content is a summary JSON or plain text
// If it contains summary metadata (meeting_id, type: 'summary'):
//   → render AgentMessageCard with title, preview, link
// Otherwise: render as plain violet-bordered text
```

---

## Add Channel Flow

```typescript
// Triggered from sidebar "+ Add Channel"
// Modal with:
//   - Channel name input (auto-prefix # in UI)
//   - Private toggle
//   - "Create Channel" button
// → calls create_channel reducer
// → creator is auto-added as member
// → navigate to new channel
```

---

## Sending a Message

```typescript
async function sendMessage(content: string) {
  await client.callReducer('send_message', [
    content,
    channelType,   // 'Channel' | 'DirectMessage'
    channelId,
  ])
  // Message appears in the list immediately via subscription
}
```

---

## Tasks

- [ ] Build `/chat/[channelId]` page with subscription to channel messages
- [ ] Build `/chat/dm/[userId]` page with subscription to DM messages
- [ ] Build `MessageInput` component (growing textarea, keyboard send)
- [ ] Build `MessageList` component with grouping, date dividers, auto-scroll
- [ ] Build `MessageBubble` component for regular and agent messages
- [ ] Build `AgentMessageCard` for CC Assistant summary messages
- [ ] Implement `open_dm` flow (find-or-create conversation)
- [ ] Implement "Add Channel" modal
- [ ] Track unread counts — update sidebar badge when new messages arrive while not viewing that channel
- [ ] Mark messages as read when channel is focused (clear unread badge)
- [ ] Handle empty state: "No messages yet — say hello!" for new channels/DMs
- [ ] Handle long messages with "Show more" expand toggle at 10 lines
- [ ] Test: multiple users sending simultaneously → messages appear in correct order
- [ ] Test: CC Assistant message renders correctly with violet styling

---

## Notes

- Message ordering: sort by `sent_at` ascending. SpacetimeDB guarantees monotonic timestamps.
- For DMs, the sidebar shows the OTHER person's name and avatar (not the DM conversation ID).
- Unread counts: track `lastSeenMessageId` per channel in `localStorage` — compare against latest message ID in subscription.
- CC Assistant `senderId = 0` means no User record exists. The `AgentMessageCard` handles this by rendering a static "CC Assistant" avatar with a violet background.
