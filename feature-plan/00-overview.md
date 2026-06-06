# CC — Feature Plan Overview

> This directory contains the piece-by-piece implementation plan for CC, the meeting agent tool.
> Each file is an independent, sequentially ordered feature that builds on the previous.

---

## Build Order

| # | Feature | File | Depends On |
|---|---|---|---|
| 01 | Project Setup & Infrastructure | `01-project-setup.md` | — |
| 02 | SpacetimeDB Module (Schema + Reducers) | `02-spacetimedb-module.md` | 01 |
| 03 | Authentication (Register, Login, Invite) | `03-authentication.md` | 02 |
| 04 | App Shell & Navigation | `04-app-shell.md` | 03 |
| 05 | Admin: Employee Management | `05-employee-management.md` | 04 |
| 06 | Real-time Chat (Channels + DMs) | `06-chat.md` | 04 |
| 07 | Meetings: Scheduling & Management | `07-meetings.md` | 04 |
| 08 | LiveKit Video Room | `08-livekit-video-room.md` | 07 |
| 09 | LiveKit Agent (Python Worker) | `09-livekit-agent.md` | 08 |
| 10 | Pinecone RAG Integration | `10-pinecone-rag.md` | 09 |
| 11 | Meeting Summaries | `11-meeting-summaries.md` | 09, 10 |
| 12 | Settings & Profile | `12-settings-profile.md` | 04 |

---

## Tech Stack Reference

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Database | SpacetimeDB (auth + persistence + real-time) |
| Video/Audio | LiveKit Rooms + Components |
| AI Agent | LiveKit Agents SDK (Python) |
| STT | Google Cloud Speech-to-Text |
| LLM | Google Gemini Flash (detection) + Pro (summaries) |
| TTS | Google Cloud Text-to-Speech |
| Vector DB | Pinecone (namespaced per company) |
| Invite Email | Resend API |

---

## Monorepo Structure

```
spacetime-hack/
├── web/                  # Next.js frontend
├── agent/                # Python LiveKit agent worker
├── spacetime-module/     # SpacetimeDB Rust module
└── feature-plan/         # This directory — all feature plans
```

---

## Key Architectural Decisions

- All data lives in SpacetimeDB — no separate Postgres
- Frontend subscribes to SpacetimeDB tables for real-time updates (no REST polling)
- LiveKit agent is a standalone Python process — one instance per active meeting
- Pinecone is namespaced `company_{id}` for strict data isolation
- No email delivery of summaries — all in-app via SpacetimeDB `messages` table
- Google models used exclusively for all AI (STT, LLM, TTS, embeddings)
