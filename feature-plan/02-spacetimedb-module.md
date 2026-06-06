# 02 — SpacetimeDB Module (Schema + Reducers)

**Depends on:** 01 — Project Setup  
**Blocks:** 03 Authentication, all data features  
**Estimated effort:** Medium

---

## Goal

Define all SpacetimeDB tables and reducers in the Rust module. This is the single source of truth for all application data — users, companies, meetings, channels, messages, and summaries. All frontend real-time subscriptions and agent writes flow through this module.

---

## Tables

### `companies`
```rust
#[spacetimedb(table)]
pub struct Company {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub name: String,
    pub created_at: Timestamp,
    pub admin_user_id: u64,
}
```

### `users`
```rust
#[spacetimedb(table)]
pub struct User {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub company_id: u64,
    pub email: String,             // unique within company
    pub display_name: String,
    pub password_hash: String,     // bcrypt hash
    pub role: UserRole,            // Admin | Employee
    pub invite_token: Option<String>, // None after activation
    pub is_active: bool,
    pub created_at: Timestamp,
}

#[derive(SpacetimeType)]
pub enum UserRole {
    Admin,
    Employee,
}
```

### `meetings`
```rust
#[spacetimedb(table)]
pub struct Meeting {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub company_id: u64,
    pub title: String,
    pub description: Option<String>,
    pub scheduled_at: Timestamp,
    pub started_at: Option<Timestamp>,
    pub ended_at: Option<Timestamp>,
    pub livekit_room_name: String,    // unique room ID bridging LiveKit
    pub created_by: u64,              // user_id
    pub status: MeetingStatus,
}

#[derive(SpacetimeType)]
pub enum MeetingStatus {
    Scheduled,
    Active,
    Ended,
}
```

### `meeting_participants`
```rust
#[spacetimedb(table)]
pub struct MeetingParticipant {
    #[primarykey]
    pub meeting_id: u64,
    #[primarykey]
    pub user_id: u64,
    pub joined_at: Option<Timestamp>,
}
```

### `channels`
```rust
#[spacetimedb(table)]
pub struct Channel {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub company_id: u64,
    pub name: String,             // without #, e.g. "general"
    pub created_by: u64,
    pub created_at: Timestamp,
    pub is_private: bool,
}
```

### `channel_members`
```rust
#[spacetimedb(table)]
pub struct ChannelMember {
    #[primarykey]
    pub channel_id: u64,
    #[primarykey]
    pub user_id: u64,
    pub joined_at: Timestamp,
}
```

### `dm_conversations`
```rust
#[spacetimedb(table)]
pub struct DmConversation {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub company_id: u64,
    pub user_a_id: u64,    // always the lower ID of the pair
    pub user_b_id: u64,    // always the higher ID of the pair
    pub created_at: Timestamp,
}
```

### `messages`
```rust
#[spacetimedb(table)]
pub struct Message {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub company_id: u64,
    pub sender_id: u64,        // 0 = CC Assistant (system)
    pub content: String,
    pub sent_at: Timestamp,
    pub channel_type: ChannelType,
    pub channel_id: u64,
    pub is_agent_message: bool, // true for CC Assistant messages
}

#[derive(SpacetimeType)]
pub enum ChannelType {
    Channel,          // channel_id → channels.id
    DirectMessage,    // channel_id → dm_conversations.id
    MeetingThread,    // channel_id → meetings.id
}
```

### `meeting_summaries`
```rust
#[spacetimedb(table)]
pub struct MeetingSummary {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub meeting_id: u64,
    pub company_id: u64,
    pub summary_text: String,
    pub key_decisions: String,   // JSON: Vec<String>
    pub action_items: String,    // JSON: Vec<{item, owner, due_date}>
    pub generated_at: Timestamp,
    pub pinecone_indexed: bool,
}
```

---

## Reducers

### Auth Reducers
```rust
// Register company + admin user
#[spacetimedb(reducer)]
pub fn register_company(ctx: ReducerContext, company_name: String, admin_name: String, email: String, password_hash: String)

// Login — validate credentials, return session token (handled by SpacetimeDB auth)
#[spacetimedb(reducer)]
pub fn login(ctx: ReducerContext, email: String, password_hash: String)

// Create invite token for a new employee
#[spacetimedb(reducer)]
pub fn create_invite(ctx: ReducerContext, email: String, role: UserRole) -> String

// Employee accepts invite and sets password
#[spacetimedb(reducer)]
pub fn accept_invite(ctx: ReducerContext, token: String, display_name: String, password_hash: String)
```

### Meeting Reducers
```rust
// Create a new meeting
#[spacetimedb(reducer)]
pub fn create_meeting(ctx: ReducerContext, title: String, description: Option<String>, scheduled_at: Timestamp, participant_ids: Vec<u64>)

// Mark meeting as started (called when LiveKit room_started webhook fires)
#[spacetimedb(reducer)]
pub fn start_meeting(ctx: ReducerContext, meeting_id: u64)

// Mark meeting as ended
#[spacetimedb(reducer)]
pub fn end_meeting(ctx: ReducerContext, meeting_id: u64)
```

### Message Reducers
```rust
// Send a message to any channel type
#[spacetimedb(reducer)]
pub fn send_message(ctx: ReducerContext, content: String, channel_type: ChannelType, channel_id: u64)

// Agent writes a message (called from Python agent via SDK)
#[spacetimedb(reducer)]
pub fn post_agent_message(ctx: ReducerContext, content: String, channel_type: ChannelType, channel_id: u64, company_id: u64)
```

### Channel Reducers
```rust
#[spacetimedb(reducer)]
pub fn create_channel(ctx: ReducerContext, name: String, is_private: bool)

#[spacetimedb(reducer)]
pub fn join_channel(ctx: ReducerContext, channel_id: u64)

#[spacetimedb(reducer)]
pub fn open_dm(ctx: ReducerContext, other_user_id: u64) // finds or creates DM conversation
```

### Summary Reducers
```rust
// Agent calls this to store the generated summary
#[spacetimedb(reducer)]
pub fn store_meeting_summary(ctx: ReducerContext, meeting_id: u64, company_id: u64, summary_text: String, key_decisions: String, action_items: String)

// Mark summary as indexed in Pinecone
#[spacetimedb(reducer)]
pub fn mark_summary_indexed(ctx: ReducerContext, summary_id: u64)
```

---

## Module Init

On first deployment, `init` reducer should:
1. Do nothing (companies register themselves)

On company registration, automatically:
- Create the company record
- Create the admin user
- Create a `#general` channel
- Add admin as a member of `#general`

---

## Deployment

```bash
# Start local SpacetimeDB
spacetime start

# Publish module
cd spacetime-module
spacetime publish --server local cc-module

# Generate TypeScript bindings for frontend
spacetime generate --lang typescript --out-dir ../web/lib/spacetimedb-types
```

---

## Tasks

- [ ] Define all table structs in `src/lib.rs`
- [ ] Implement `register_company` reducer with auto-creation of `#general` channel
- [ ] Implement `create_invite` + `accept_invite` reducers
- [ ] Implement `create_meeting` reducer — auto-generates `livekit_room_name` as `cc-{meeting_id}-{timestamp}`
- [ ] Implement `start_meeting` / `end_meeting` reducers
- [ ] Implement `send_message` + `post_agent_message` reducers
- [ ] Implement `create_channel` / `join_channel` / `open_dm` reducers
- [ ] Implement `store_meeting_summary` + `mark_summary_indexed` reducers
- [ ] Publish module to local SpacetimeDB instance
- [ ] Generate TypeScript client bindings into `web/lib/spacetimedb-types/`
- [ ] Verify all table subscriptions work from `spacetime logs`

---

## Notes

- `sender_id = 0` is reserved for the CC Assistant agent. No real user will have ID 0 (autoinc starts at 1).
- `dm_conversations` enforces a deterministic pair: `user_a_id < user_b_id` always. The `open_dm` reducer enforces this.
- `livekit_room_name` format: `cc-{company_id}-{meeting_id}` for easy parsing in the agent.
- All reducers must validate that the calling user belongs to the same `company_id` as the target resource.
