import asyncio
import os
import time
from dataclasses import dataclass
from typing import Any

from pinecone import Pinecone, ServerlessSpec


EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 3072


@dataclass
class RAGMatch:
    score: float
    metadata: dict[str, Any]


class PineconeRAG:
    def __init__(self, company_id: int, gemini):
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX_NAME", "cc-meetings")
        if not api_key:
            raise RuntimeError("PINECONE_API_KEY is required")

        self.company_id = company_id
        self.gemini = gemini
        self.namespace = f"company_{company_id}"
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name

        # Ensure the index exists (create if missing)
        self.index = self._ensure_index()

    def _ensure_index(self):
        """Check if the Pinecone index exists; create it if it doesn't."""
        existing = [idx.name for idx in self.pc.list_indexes()]

        if self.index_name not in existing:
            print(f"Pinecone index '{self.index_name}' not found. Creating with "
                  f"dimension={EMBEDDING_DIMENSION}, metric=cosine ...")
            self.pc.create_index(
                name=self.index_name,
                dimension=EMBEDDING_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
            # Wait for the index to be ready (up to 60 seconds)
            deadline = time.time() + 60
            while time.time() < deadline:
                desc = self.pc.describe_index(self.index_name)
                if desc.status.get("ready", False):
                    break
                time.sleep(2)
            print(f"Pinecone index '{self.index_name}' is ready.")

        return self.pc.Index(self.index_name)

    async def query(self, text: str, top_k: int = 3) -> list[RAGMatch]:
        embedding = await self.gemini.embed_text(text)
        result = self.index.query(
            vector=embedding,
            top_k=top_k,
            namespace=self.namespace,
            include_metadata=True,
        )
        return [
            RAGMatch(score=float(match.score or 0), metadata=dict(match.metadata or {}))
            for match in result.matches
        ]

    async def index_meeting(self, meeting_id: int, transcript: list[dict[str, Any]], summary: dict[str, Any]):
        chunks = self._chunk_transcript(transcript)
        vectors = []
        for index, chunk_text in enumerate(chunks):
            embedding = await self.gemini.embed_text(chunk_text)
            vectors.append(
                {
                    "id": f"meeting_{meeting_id}_chunk_{index}",
                    "values": embedding,
                    "metadata": {
                        "meeting_id": meeting_id,
                        "chunk_text": chunk_text,
                        "summary": summary.get("summary_text", "")[:1000],
                    },
                }
            )
        if vectors:
            self.index.upsert(vectors=vectors, namespace=self.namespace)

    def _chunk_transcript(self, transcript: list[dict[str, Any]]) -> list[str]:
        lines = [
            f"[{item['timestamp']}] {item['speaker']}: {item['text']}"
            for item in transcript
        ]
        chunks: list[str] = []
        current: list[str] = []
        current_length = 0
        for line in lines:
            current.append(line)
            current_length += len(line)
            if current_length >= 1800:
                chunks.append("\n".join(current))
                current = []
                current_length = 0
        if current:
            chunks.append("\n".join(current))
        return chunks
