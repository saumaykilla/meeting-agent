# Concensus AI

**Concensus AI** is an intelligent meeting assistant and real-time collaboration platform. It joins your meetings as an active participant ("CC"), listens to conversations, remembers past decisions, and intelligently interjects when the team is discussing a problem or topic that has already been resolved in past meetings. 

🔗 **Live Demo:** [https://concencus-ai.vercel.app](https://concencus-ai.vercel.app)

---

## 🏗 Architecture & Tools Used

Concensus AI is built using a modern, real-time, AI-native stack:

- **Frontend Application:**
  - **Framework:** [Next.js](https://nextjs.org/) (App Router) & React
  - **Styling:** Tailwind CSS & custom animations
  - **Real-time UI:** `@livekit/components-react` for WebRTC video, audio, and screen sharing grids.

- **Real-Time Communication & Agent Infrastructure:**
  - **WebRTC Network:** [LiveKit Cloud](https://livekit.io/)
  - **Agent Framework:** LiveKit Python Agents SDK (`livekit-agents`)
  - **Multimodal AI:** Google Gemini Realtime API (`gemini-2.0-flash-exp`) for ultra-low latency voice-to-voice interaction.

- **Persistence & State Management:**
  - **Database:** [SpacetimeDB](https://spacetimedb.com/) - A unified relational database and backend engine. It handles all real-time application state (users, active meetings, chat threads, and generated summaries) without needing a traditional REST API.

- **Agent Memory & RAG (Retrieval-Augmented Generation):**
  - **Vector Database:** [Pinecone](https://www.pinecone.io/) for indexing meeting transcripts, key decisions, and action items.
  - **Embeddings & Extraction:** Google Gemini Pro APIs for generating meeting summaries and text embeddings.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- LiveKit Cloud account (API Key & Secret)
- Google Gemini API Key
- Pinecone API Key

### 1. Web Frontend Setup
Navigate to the `web` directory and install dependencies:
```bash
cd web
npm install
```

Create a `.env.local` file in the `web` directory with your LiveKit and SpacetimeDB credentials:
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_SPACETIMEDB_URI=your_spacetime_uri
```

Start the Next.js development server:
```bash
npm run dev
```

### 2. AI Agent Setup
Navigate to the `agent` directory and create a virtual environment:
```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `agent` directory:
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
SPACETIMEDB_URI=your_spacetime_uri
```

Start the agent locally in development mode:
```bash
python main.py dev
```

---

## ☁️ Deployment

### Deploying the Frontend
The frontend is optimized for **Vercel**. 
1. Push your repository to GitHub.
2. Import the project in Vercel and set the Root Directory to `web`.
3. Add the environment variables from your `.env.local` to the Vercel project settings.
4. Click **Deploy**.

### Deploying the AI Agent
The Python agent is deployed directly to **LiveKit Cloud** as a managed worker.

1. Ensure the LiveKit CLI is installed and authenticated:
```bash
lk cloud auth
```
2. Set your default project:
```bash
lk project set-default <your-project-name>
```
3. Deploy the agent (this packages your Python code into a Docker container and deploys it to LiveKit's edge network):
```bash
lk agent deploy
```

Once deployed, LiveKit will automatically spin up instances of the agent and dispatch them to any newly created meeting rooms.
