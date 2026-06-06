# 09 — LiveKit Agent (Python Worker)

**Depends on:** 08 — LiveKit Video Room (room must exist to join)  
**Blocks:** 10 — Pinecone RAG, 11 — Meeting Summaries  
**Estimated effort:** Large

---

## Goal

Build the Python-based CC Assistant agent that joins every meeting as a bot participant. The agent:
1. Listens to all audio via Google STT (streaming, speaker-diarized)
2. Detects topics being discussed and queries Pinecone for past discussions
3. Speaks via Google TTS when a repeated topic is detected or when `@CC` is said
4. Generates a full meeting summary via Gemini when the meeting ends
5. Writes the summary to SpacetimeDB

---

## Architecture

```
LiveKit Room (active)
       │ Audio tracks from all human participants
       ▼
CC Agent Worker (Python — livekit-agents)
├── VAD (Voice Activity Detection) — silero plugin
├── STT — Google Cloud Speech-to-Text (streaming, speaker-diarized)
│     → Rolling transcript buffer (in-memory)
├── Topic Monitor (background task, every 30s)
│     → Gemini Flash: extract current topic
│     → Pinecone query: find past similar discussions
│     → If match found AND score > 0.85: speak via TTS
├── Wake Word Detector
│     → STT listens for "@CC" or "Hey CC"
│     → On detection: enter Q&A mode
│     → Gemini processes question + Pinecone RAG
│     → TTS speaks answer
└── Meeting End Handler
      → Full transcript → Gemini Pro → summary JSON
      → Write to SpacetimeDB (meeting_summaries + messages tables)
      → Chunk + embed transcript → Pinecone upsert
```

---

## Entry Point

```python
# agent/main.py
import asyncio
from livekit import agents
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from pipeline import CCAgentPipeline

async def entrypoint(ctx: JobContext):
    # Parse room name to get company_id and meeting_id
    # Format: cc-{company_id}-{meeting_id}
    parts = ctx.room.name.split('-')
    company_id = int(parts[1])
    meeting_id = int(parts[2])
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    pipeline = CCAgentPipeline(
        ctx=ctx,
        company_id=company_id,
        meeting_id=meeting_id,
    )
    await pipeline.run()

if __name__ == '__main__':
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

---

## Pipeline — `agent/pipeline.py`

```python
class CCAgentPipeline:
    def __init__(self, ctx, company_id, meeting_id):
        self.ctx = ctx
        self.company_id = company_id
        self.meeting_id = meeting_id
        
        # Transcript state
        self.transcript_buffer = []       # list of {speaker, text, timestamp}
        self.full_transcript = []         # accumulates entire meeting
        
        # State flags
        self.is_speaking = False          # prevent overlapping TTS
        self.last_topic_check = 0         # timestamp of last Pinecone query
        self.in_qa_mode = False           # True when responding to @CC
        
        # Sub-modules
        self.stt = GoogleSTT()
        self.tts = GoogleTTS()
        self.gemini = GeminiClient()
        self.rag = PineconeRAG(company_id=company_id)
        self.spacetime = SpacetimeWriter(company_id=company_id, meeting_id=meeting_id)
    
    async def run(self):
        # Start STT listener on all remote audio tracks
        self._start_stt_listener()
        
        # Start background topic monitor
        asyncio.create_task(self._topic_monitor_loop())
        
        # Listen for room disconnect (meeting ended)
        self.ctx.room.on('disconnected', self._on_meeting_end)
        
        # Keep alive
        await asyncio.sleep(float('inf'))
```

---

## STT Layer — `agent/pipeline.py`

```python
from livekit.plugins import google as livekit_google

class GoogleSTT:
    async def stream(self, audio_track):
        """Stream audio from a participant track through Google STT."""
        stt_stream = livekit_google.STT(
            model='chirp_2',          # Google Chirp 2 — best accuracy
            languages=['en-US'],
            interim_results=True,
        )
        
        async for event in stt_stream:
            if event.type == SpeechEventType.FINAL_TRANSCRIPT:
                yield {
                    'speaker': audio_track.participant.name,
                    'text': event.alternatives[0].text,
                    'timestamp': datetime.now().isoformat(),
                }
```

Each remote participant's audio track is subscribed to individually. The STT streams all results into `self.full_transcript` and `self.transcript_buffer` (last 30s).

---

## Topic Monitor — background task

```python
async def _topic_monitor_loop(self):
    """Run every 30 seconds to detect repeated topics."""
    while True:
        await asyncio.sleep(30)
        
        if len(self.transcript_buffer) < 3:
            continue  # not enough speech yet
        
        if self.is_speaking or self.in_qa_mode:
            continue  # don't interrupt if already talking
        
        # Extract current topic from recent transcript
        recent_text = ' '.join([t['text'] for t in self.transcript_buffer[-10:]])
        topic = await self.gemini.extract_topic(recent_text)
        
        if not topic:
            continue
        
        # Query Pinecone for similar past discussions
        results = await self.rag.query(topic, top_k=1)
        
        if results and results[0].score > 0.85:
            match = results[0]
            message = self._format_recall_message(topic, match)
            await self._speak(message)
            # Also post to meeting chat as text
            await self.spacetime.post_message(message)
        
        # Clear buffer for next window
        self.transcript_buffer = []
```

---

## Wake Word / @CC Handler

```python
async def _check_wake_word(self, transcript_text: str):
    """Called on every new final transcript chunk."""
    WAKE_PHRASES = ['@cc', 'hey cc', 'cc,', 'ask cc']
    
    lower = transcript_text.lower()
    for phrase in WAKE_PHRASES:
        if phrase in lower:
            # Extract the question (text after the wake phrase)
            question = lower.split(phrase, 1)[1].strip()
            if question:
                await self._handle_question(question)
            break

async def _handle_question(self, question: str):
    """RAG query + TTS response for @CC questions."""
    self.in_qa_mode = True
    try:
        # Query Pinecone for relevant context
        results = await self.rag.query(question, top_k=3)
        context = '\n'.join([r.metadata['chunk_text'] for r in results])
        
        # Ask Gemini with context
        answer = await self.gemini.answer_question(question, context)
        await self._speak(answer)
        await self.spacetime.post_message(f"@CC: {answer}")
    finally:
        self.in_qa_mode = False
```

---

## TTS Layer

```python
from livekit.plugins import google as livekit_google

async def _speak(self, text: str):
    """Synthesize text and publish audio to the LiveKit room."""
    if self.is_speaking:
        return
    
    self.is_speaking = True
    try:
        tts = livekit_google.TTS(
            voice='en-US-Journey-F',   # Natural-sounding voice
            speaking_rate=1.0,
        )
        audio_source = rtc.AudioSource(sample_rate=24000, num_channels=1)
        track = rtc.LocalAudioTrack.create_audio_track('cc-voice', audio_source)
        
        await self.ctx.room.local_participant.publish_track(track)
        
        async for audio_chunk in tts.synthesize(text):
            await audio_source.capture_frame(audio_chunk)
        
        await self.ctx.room.local_participant.unpublish_track(track)
    finally:
        self.is_speaking = False
```

---

## Gemini Client — `agent/gemini_client.py`

```python
import google.generativeai as genai

class GeminiClient:
    def __init__(self):
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.flash = genai.GenerativeModel('gemini-1.5-flash')
        self.pro = genai.GenerativeModel('gemini-1.5-pro')
    
    async def extract_topic(self, text: str) -> str | None:
        """Extract the main topic from recent transcript text."""
        prompt = f"""
        From this meeting transcript excerpt, identify the single main topic being discussed.
        Return only the topic as a short phrase (3-8 words). 
        Return null if the conversation is casual/off-topic.
        
        Transcript: {text}
        """
        response = await self.flash.generate_content_async(prompt)
        return response.text.strip() if response.text != 'null' else None
    
    async def answer_question(self, question: str, context: str) -> str:
        """Answer a question about past meetings using RAG context."""
        prompt = f"""
        You are CC Assistant, an AI meeting assistant for a company.
        Answer the following question based on past meeting context.
        Be concise (2-3 sentences max). Speak naturally as if in a meeting.
        
        Past meeting context:
        {context}
        
        Question: {question}
        """
        response = await self.flash.generate_content_async(prompt)
        return response.text.strip()
    
    async def generate_summary(self, transcript: list[dict]) -> dict:
        """Generate structured meeting summary from full transcript."""
        formatted = '\n'.join([
            f"[{t['timestamp']}] {t['speaker']}: {t['text']}"
            for t in transcript
        ])
        
        prompt = f"""
        Generate a structured meeting summary from this transcript.
        Return a JSON object with these fields:
        - summary_text: string (3-5 paragraph summary)
        - key_decisions: array of strings (each is a decision made)
        - action_items: array of objects with fields: item, owner, due_date (best guess)
        
        Transcript:
        {formatted}
        
        Return valid JSON only, no markdown.
        """
        response = await self.pro.generate_content_async(prompt)
        return json.loads(response.text)
    
    async def embed_text(self, text: str) -> list[float]:
        """Get embedding vector for Pinecone indexing."""
        result = genai.embed_content(
            model='models/text-embedding-004',
            content=text,
        )
        return result['embedding']
```

---

## Meeting End Handler

```python
async def _on_meeting_end(self):
    """Called when LiveKit room is closed."""
    if not self.full_transcript:
        return
    
    print(f"Meeting {self.meeting_id} ended. Generating summary...")
    
    # 1. Generate summary with Gemini Pro
    summary_data = await self.gemini.generate_summary(self.full_transcript)
    
    # 2. Write to SpacetimeDB
    await self.spacetime.store_summary(
        summary_text=summary_data['summary_text'],
        key_decisions=json.dumps(summary_data['key_decisions']),
        action_items=json.dumps(summary_data['action_items']),
    )
    
    # 3. Post summary as meeting thread message
    preview = summary_data['summary_text'][:200] + '...'
    await self.spacetime.post_agent_message(
        content=json.dumps({
            'type': 'summary',
            'meeting_id': self.meeting_id,
            'preview': preview,
        }),
        channel_type='MeetingThread',
        channel_id=self.meeting_id,
    )
    
    # 4. Index transcript chunks in Pinecone
    await self.rag.index_meeting(
        meeting_id=self.meeting_id,
        transcript=self.full_transcript,
        summary=summary_data,
    )
    
    print(f"Meeting {self.meeting_id} processed successfully.")
```

---

## SpacetimeDB Writer — `agent/spacetime_client.py`

```python
from spacetimedb_sdk import SpacetimeDBClient

class SpacetimeWriter:
    def __init__(self, company_id: int, meeting_id: int):
        self.client = SpacetimeDBClient(
            host=os.getenv('SPACETIMEDB_HOST'),
            module=os.getenv('SPACETIMEDB_MODULE'),
        )
        self.company_id = company_id
        self.meeting_id = meeting_id
    
    async def store_summary(self, summary_text, key_decisions, action_items):
        await self.client.call_reducer('store_meeting_summary', [
            self.meeting_id,
            self.company_id,
            summary_text,
            key_decisions,
            action_items,
        ])
    
    async def post_agent_message(self, content, channel_type, channel_id):
        await self.client.call_reducer('post_agent_message', [
            content,
            channel_type,
            channel_id,
            self.company_id,
        ])
```

---

## Running the Agent

```bash
# Start the agent worker (listens for new LiveKit rooms)
cd agent
source .venv/bin/activate
python main.py start

# The agent will automatically join any room that matches the cc-* pattern
# One worker process handles multiple simultaneous meetings
```

---

## Tasks

- [ ] Set up Google Cloud credentials (Speech-to-Text, TTS, Gemini APIs)
- [ ] Build `main.py` entry point with room name parsing
- [ ] Build `CCAgentPipeline` class with full state management
- [ ] Implement `GoogleSTT` streaming per participant track
- [ ] Implement `_topic_monitor_loop` with 30s background task
- [ ] Implement `_check_wake_word` and `_handle_question` 
- [ ] Implement `_speak` with LiveKit audio publish
- [ ] Build `GeminiClient` with: `extract_topic`, `answer_question`, `generate_summary`, `embed_text`
- [ ] Build `SpacetimeWriter` for writing summaries + messages from Python
- [ ] Build `_on_meeting_end` handler for full pipeline
- [ ] Test: agent joins room, STT picks up speech, transcript builds correctly
- [ ] Test: topic detection fires and agent speaks (use a test Pinecone with seeded data)
- [ ] Test: "@CC what did we decide last time?" → agent responds correctly
- [ ] Test: meeting ends → summary generated → appears in SpacetimeDB
- [ ] Add graceful error handling: if Gemini/Pinecone fails, log and continue (don't crash room)
- [ ] Add cooldown on topic detection: don't fire more than once per 5 minutes for same topic

---

## Notes

- The agent worker uses `cli.run_app` which keeps a persistent process listening for LiveKit room assignments. LiveKit Cloud pushes room join jobs to the worker.
- `speaker_diarization` in Google STT helps attribute transcript chunks to specific speakers — critical for quality summaries.
- Agent identity in LiveKit: set `identity = "cc-agent-{meeting_id}"` so the room page can detect and render the special agent tile.
- If Google STT rate limits, implement exponential backoff on the stream reconnect.
