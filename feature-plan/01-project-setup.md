# 01 — Project Setup & Infrastructure

**Depends on:** Nothing  
**Blocks:** All other features  
**Estimated effort:** Small

---

## Goal

Bootstrap the monorepo with all three sub-projects (Next.js web, Python agent, SpacetimeDB module) configured and ready for development. All environment variables wired, all package managers initialized, dev servers runnable.

---

## Sub-Projects

### 1. `web/` — Next.js Frontend

**Initialize:**
```bash
npx create-next-app@latest web --typescript --app --no-tailwind --eslint
```

**Install dependencies:**
```bash
cd web
npm install @livekit/components-react @livekit/client livekit-client
npm install @spacetimedb/sdk
npm install resend
npm install clsx
```

**Folder structure to create:**
```
web/
├── app/
│   ├── (auth)/
│   │   ├── register/page.tsx
│   │   ├── login/page.tsx
│   │   └── setup/page.tsx        # invite flow
│   ├── (app)/
│   │   ├── layout.tsx            # sidebar shell
│   │   ├── dashboard/page.tsx
│   │   ├── chat/
│   │   │   ├── [channelId]/page.tsx
│   │   │   └── dm/[userId]/page.tsx
│   │   ├── meetings/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # lobby
│   │   │       └── room/page.tsx # live room
│   │   ├── summaries/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── employees/page.tsx
│   │       └── settings/page.tsx
│   └── api/
│       ├── livekit/
│       │   ├── token/route.ts
│       │   └── webhook/route.ts
│       └── invite/route.ts
├── components/
│   ├── ui/                       # primitives (button, input, card, badge, avatar)
│   ├── layout/                   # sidebar, header, shell
│   ├── chat/                     # message, input, thread
│   ├── meetings/                 # meeting card, participant tile
│   └── agent/                   # CC Assistant message, summary card
├── lib/
│   ├── spacetimedb.ts            # SpacetimeDB client singleton
│   ├── auth.ts                   # session helpers
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useMessages.ts
│   ├── useMeetings.ts
│   └── useCompany.ts
└── styles/
    └── globals.css               # CC design tokens, Geist font
```

**Environment variables (`web/.env.local`):**
```env
NEXT_PUBLIC_SPACETIMEDB_HOST=localhost:3000
NEXT_PUBLIC_SPACETIMEDB_MODULE=cc-module
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

### 2. `spacetime-module/` — SpacetimeDB Rust Module

**Initialize:**
```bash
spacetime init spacetime-module --lang rust
```

**Folder structure:**
```
spacetime-module/
├── src/
│   ├── lib.rs          # module entry point
│   ├── tables/
│   │   ├── companies.rs
│   │   ├── users.rs
│   │   ├── meetings.rs
│   │   ├── channels.rs
│   │   ├── messages.rs
│   │   └── summaries.rs
│   └── reducers/
│       ├── auth.rs
│       ├── meetings.rs
│       ├── channels.rs
│       └── messages.rs
└── Cargo.toml
```

---

### 3. `agent/` — Python LiveKit Agent

**Initialize:**
```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install livekit-agents livekit-plugins-google livekit-plugins-silero
pip install pinecone-client google-cloud-speech google-cloud-texttospeech
pip install google-generativeai spacetimedb-sdk python-dotenv
```

**Folder structure:**
```
agent/
├── main.py               # entry point — LiveKit agent worker
├── pipeline.py           # STT → LLM → TTS pipeline
├── rag.py                # Pinecone query + indexing
├── summarizer.py         # Gemini summary generation
├── spacetime_client.py   # SpacetimeDB writer
├── requirements.txt
└── .env
```

**Environment variables (`agent/.env`):**
```env
LIVEKIT_URL=wss://your-livekit-server
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GOOGLE_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=cc-meetings
SPACETIMEDB_HOST=localhost:3000
SPACETIMEDB_MODULE=cc-module
```

---

## Tasks

- [ ] Initialize Next.js app in `web/`
- [ ] Install all frontend npm packages
- [ ] Create full folder structure with empty placeholder files
- [ ] Set up `globals.css` with CC design tokens (charcoal, violet, Geist font via CSS import)
- [ ] Initialize SpacetimeDB module in `spacetime-module/`
- [ ] Set up Python venv and install all agent packages in `agent/`
- [ ] Create all `.env` / `.env.local` files with placeholder values
- [ ] Add `README.md` at repo root explaining how to start each sub-project
- [ ] Verify `npm run dev` starts the Next.js app at port 3001
- [ ] Verify SpacetimeDB CLI can publish the empty module

---

## Global CSS Design Tokens

```css
/* web/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

:root {
  --color-primary: #1A1A1A;
  --color-accent: #7C5CFC;
  --color-surface: #F9F8F6;
  --color-card: #FFFFFF;
  --color-border: #E8E5DF;
  --color-muted: #8A8680;
  --color-danger: #D94F4F;
  --color-success: #2E9E6B;
  --color-agent-bg: #F5F3FF;
  --color-agent-border: #7C5CFC;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  --sidebar-width: 240px;
  --font-base: 'Geist', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-base); background: var(--color-surface); color: var(--color-primary); }
```
