# 10 — Pinecone RAG Integration

**Depends on:** 09 — LiveKit Agent (agent calls RAG)  
**Blocks:** 11 — Meeting Summaries (indexing step)  
**Estimated effort:** Medium

---

## Goal

Build the Pinecone vector database integration that gives CC its institutional memory. Every meeting transcript is chunked, embedded, and stored in Pinecone. During meetings, the agent queries Pinecone to detect when a topic has been discussed before and retrieves the relevant context to share with the team.

---

## Architecture

```
Meeting Ends:
  Full transcript → Chunk (500-token chunks, 50-token overlap)
  Each chunk → Gemini embedding (text-embedding-004, 768 dims)
  Upsert to Pinecone namespace: company_{company_id}

During Meeting (every 30s):
  Recent 30s transcript → Extract topic (Gemini Flash)
  Topic → Gemini embedding
  Query Pinecone namespace: company_{company_id}
  If score > 0.85 → agent speaks / posts to chat

@CC Question:
  User question → Gemini embedding
  Query Pinecone top_k=3
  Concat chunk_text → Gemini answer → TTS
```

---

## Pinecone Setup

```python
# Pinecone index configuration:
# Name: cc-meetings (one index per environment)
# Dimension: 768 (matches Gemini text-embedding-004)
# Metric: cosine
# Serverless spec: AWS us-east-1

# One index, namespaced per company:
# namespace = f"company_{company_id}"
```

```python
# agent/rag.py
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

def get_index():
    index_name = os.getenv('PINECONE_INDEX_NAME', 'cc-meetings')
    if index_name not in [i.name for i in pc.list_indexes()]:
        pc.create_index(
            name=index_name,
            dimension=768,
            metric='cosine',
            spec=ServerlessSpec(cloud='aws', region='us-east-1')
        )
    return pc.Index(index_name)
```

---

## Vector Record Format

```python
{
    "id": f"meeting_{meeting_id}_chunk_{chunk_index}",
    "values": [...768-dim embedding...],
    "metadata": {
        "company_id": str(company_id),
        "meeting_id": str(meeting_id),
        "meeting_date": "2026-06-10T10:00:00Z",
        "participants": ["Sarah Johnson", "James Lee"],
        "chunk_text": "We decided to move the Q3 deadline to end of July...",
        "topics": ["deadline", "Q3"],          # extracted by Gemini
        "chunk_index": 3,
        "total_chunks": 12,
    }
}
```

---

## `PineconeRAG` Class — `agent/rag.py`

```python
class PineconeRAG:
    def __init__(self, company_id: int):
        self.company_id = company_id
        self.namespace = f"company_{company_id}"
        self.index = get_index()
        self.gemini = GeminiClient()
    
    async def query(self, text: str, top_k: int = 3) -> list[QueryMatch]:
        """Query Pinecone for similar past discussions."""
        if not text or len(text.strip()) < 10:
            return []
        
        embedding = await self.gemini.embed_text(text)
        
        results = self.index.query(
            namespace=self.namespace,
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
        )
        
        return results.matches  # list of {id, score, metadata}
    
    async def index_meeting(
        self, 
        meeting_id: int,
        transcript: list[dict],
        summary: dict,
        participants: list[str],
        meeting_date: str,
    ):
        """Chunk and embed the full meeting transcript into Pinecone."""
        chunks = self._chunk_transcript(transcript)
        
        vectors = []
        for i, chunk in enumerate(chunks):
            # Extract topics for this chunk
            topics = await self._extract_topics(chunk['text'])
            
            embedding = await self.gemini.embed_text(chunk['text'])
            
            vectors.append({
                'id': f"meeting_{meeting_id}_chunk_{i}",
                'values': embedding,
                'metadata': {
                    'company_id': str(self.company_id),
                    'meeting_id': str(meeting_id),
                    'meeting_date': meeting_date,
                    'participants': participants,
                    'chunk_text': chunk['text'],
                    'speaker': chunk.get('speaker', 'Unknown'),
                    'topics': topics,
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                }
            })
        
        # Batch upsert (Pinecone max 100 vectors per upsert)
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            self.index.upsert(
                vectors=vectors[i:i+batch_size],
                namespace=self.namespace,
            )
        
        print(f"Indexed {len(vectors)} chunks for meeting {meeting_id}")
    
    def _chunk_transcript(self, transcript: list[dict]) -> list[dict]:
        """
        Chunk transcript into ~500 token chunks with 50-token overlap.
        Groups consecutive utterances by the same speaker.
        """
        chunks = []
        current_chunk = []
        current_token_count = 0
        TOKEN_LIMIT = 500
        OVERLAP_TOKENS = 50
        
        for utterance in transcript:
            tokens = utterance['text'].split()  # rough token estimate
            
            if current_token_count + len(tokens) > TOKEN_LIMIT and current_chunk:
                # Save current chunk
                chunk_text = ' '.join([
                    f"{u['speaker']}: {u['text']}" for u in current_chunk
                ])
                chunks.append({
                    'text': chunk_text,
                    'speaker': current_chunk[-1]['speaker'],
                })
                
                # Overlap: keep last OVERLAP_TOKENS worth of utterances
                overlap_words = 0
                overlap_start = len(current_chunk) - 1
                while overlap_start > 0 and overlap_words < OVERLAP_TOKENS:
                    overlap_words += len(current_chunk[overlap_start]['text'].split())
                    overlap_start -= 1
                
                current_chunk = current_chunk[overlap_start:]
                current_token_count = sum(len(u['text'].split()) for u in current_chunk)
            
            current_chunk.append(utterance)
            current_token_count += len(tokens)
        
        # Last chunk
        if current_chunk:
            chunk_text = ' '.join([
                f"{u['speaker']}: {u['text']}" for u in current_chunk
            ])
            chunks.append({'text': chunk_text, 'speaker': current_chunk[-1]['speaker']})
        
        return chunks
    
    async def _extract_topics(self, chunk_text: str) -> list[str]:
        """Extract 2-5 topic keywords from a chunk."""
        prompt = f"""
        Extract 2-5 topic keywords from this meeting transcript chunk.
        Return as a comma-separated list of short phrases (1-3 words each).
        Example: "Q3 deadline, budget allocation, hiring freeze"
        
        Transcript: {chunk_text}
        """
        response = await self.gemini.flash.generate_content_async(prompt)
        topics = [t.strip() for t in response.text.split(',')]
        return topics[:5]
    
    def _format_recall_message(self, current_topic: str, match) -> str:
        """Format the TTS message when a past discussion is found."""
        metadata = match.metadata
        meeting_date = metadata.get('meeting_date', 'a previous meeting')[:10]
        chunk_text = metadata.get('chunk_text', '')
        
        # Truncate for TTS (max ~20 seconds of speech)
        summary = chunk_text[:300] + ('...' if len(chunk_text) > 300 else '')
        
        return (
            f"I noticed this topic was discussed on {meeting_date}. "
            f"Here's what was covered: {summary}"
        )
    
    async def delete_company_data(self, company_id: int):
        """Delete all vectors for a company (used when company account is deleted)."""
        self.index.delete(delete_all=True, namespace=f"company_{company_id}")
```

---

## Recall Message Format

When a repeated topic is detected, the agent:

1. **Speaks** (TTS): "I noticed this topic was discussed on June 3rd. Here's what was covered: [chunk excerpt]"
2. **Posts to meeting chat** (SpacetimeDB message):
```json
{
  "type": "recall",
  "topic": "Q3 deadline",
  "matching_meeting_id": 5,
  "matching_meeting_date": "2026-06-03",
  "excerpt": "The team decided to push the Q3 deadline to end of July...",
  "similarity_score": 0.91
}
```
The frontend `AgentMessageCard` renders this JSON as a formatted recall card.

---

## Similarity Threshold Tuning

| Score Range | Meaning | Action |
|---|---|---|
| > 0.90 | Near-identical topic | Always surface |
| 0.85 - 0.90 | Closely related | Surface (default threshold) |
| 0.75 - 0.85 | Somewhat related | Skip in MVP |
| < 0.75 | Different topic | Ignore |

The threshold (0.85) is configurable via `company_settings.topic_sensitivity`:
- **Low**: 0.90 threshold (fewer interruptions)
- **Medium**: 0.85 threshold (default)
- **High**: 0.80 threshold (more recalls)

---

## Cooldown Logic

```python
# Prevent spamming — track last recall per topic
self.recent_recalls = {}  # topic_hash → timestamp

def _should_recall(self, topic: str, match) -> bool:
    topic_hash = hashlib.md5(topic.encode()).hexdigest()[:8]
    last_recall = self.recent_recalls.get(topic_hash, 0)
    
    # Don't recall same topic more than once per 10 minutes
    if time.time() - last_recall < 600:
        return False
    
    # Don't recall a match from the current meeting
    if match.metadata.get('meeting_id') == str(self.meeting_id):
        return False
    
    self.recent_recalls[topic_hash] = time.time()
    return True
```

---

## Tasks

- [ ] Create Pinecone account + serverless index (`cc-meetings`, 768 dims, cosine)
- [ ] Build `PineconeRAG` class with `query` and `index_meeting` methods
- [ ] Implement `_chunk_transcript` with token-based chunking + overlap
- [ ] Implement `_extract_topics` using Gemini Flash
- [ ] Integrate `rag.query()` into the topic monitor loop in `pipeline.py`
- [ ] Integrate `rag.index_meeting()` into the meeting end handler in `pipeline.py`
- [ ] Implement `_format_recall_message` for TTS output
- [ ] Implement recall cooldown logic to prevent repeated interruptions
- [ ] Implement similarity threshold configuration from `company_settings`
- [ ] Implement `delete_company_data` for GDPR compliance
- [ ] Test: seed Pinecone with 2-3 fake past meetings, run agent, verify recall fires correctly
- [ ] Test: @CC question → RAG context → correct answer
- [ ] Test: new company with no history → graceful skip (no errors)
- [ ] Test: batch upsert correctly handles > 100 chunks (large meeting)

---

## Notes

- Gemini `text-embedding-004` outputs 768-dimension vectors — make sure Pinecone index is created with `dimension=768`.
- Namespace isolation is critical: never query across company namespaces. The `namespace` param in every Pinecone call must be set to `f"company_{company_id}"`.
- For very long meetings (>3h), chunking will produce many vectors. Batch upserts handle this automatically.
- Embeddings are generated async — use `asyncio.gather()` to parallelize embedding multiple chunks simultaneously for speed.
