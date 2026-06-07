import asyncio
import json
import os
from typing import Any

from google import genai


class GeminiClient:
    def __init__(self):
        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for Vertex AI")
        location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.client = genai.Client(
            vertexai=True,
            project=project,
            location=location
        )

    async def extract_topic(self, text: str) -> str | None:
        prompt = f"""
From this meeting transcript excerpt, identify the single main topic being discussed.
Return only the topic as a short phrase. Return null if the conversation is casual.

Transcript:
{text}
"""
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
        )
        value = (response.text or "").strip()
        return None if value.lower() in {"", "null", "none"} else value

    async def answer_question(self, question: str, context: str) -> str:
        prompt = f"""
You are CC Assistant, an AI meeting assistant.
Answer based on the past meeting context. Be concise and natural.

Past meeting context:
{context or "No relevant past context was found."}

Question:
{question}
"""
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model="gemini-1.5-flash",
            contents=prompt,
        )
        return (response.text or "").strip()

    async def generate_summary(self, transcript: list[dict[str, Any]]) -> dict[str, Any]:
        formatted = "\n".join(
            f"[{item['timestamp']}] {item['speaker']}: {item['text']}"
            for item in transcript
        )
        prompt = f"""
Generate a structured meeting summary from this transcript.
Return valid JSON only with fields:
summary_text: string
key_decisions: array of strings
action_items: array of objects with item, owner, due_date

Transcript:
{formatted}
"""
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = (response.text or "").strip()
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace != -1 and last_brace != -1:
            raw = raw[first_brace : last_brace + 1]
        return json.loads(raw)

    async def embed_text(self, text: str) -> list[float]:
        response = await asyncio.to_thread(
            self.client.models.embed_content,
            model="gemini-embedding-001",
            contents=text,
        )
        return response.embeddings[0].values
