"""
summarizer.py — Standalone meeting summarizer module

Wraps the Gemini Pro summary generation so it can be called from the
pipeline or invoked independently (e.g. for retrying a failed summary
after the meeting ends without re-running the whole agent).
"""
import json
from typing import Any

from gemini_client import GeminiClient


class MeetingSummarizer:
    """Generates structured meeting summaries from a raw transcript."""

    def __init__(self, gemini: GeminiClient | None = None):
        self.gemini = gemini or GeminiClient()

    async def summarize(self, transcript: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Generate a structured summary from a transcript.

        Args:
            transcript: List of dicts with keys 'speaker', 'text', 'timestamp'.

        Returns:
            Dict with keys:
              - summary_text: str  (3-5 paragraphs)
              - key_decisions: list[str]
              - action_items: list[dict] (each has 'item', 'owner', 'due_date')
        """
        if not transcript:
            return {
                "summary_text": "No transcript was captured for this meeting.",
                "key_decisions": [],
                "action_items": [],
            }
        return await self.gemini.generate_summary(transcript)

    def format_for_message(self, summary_data: dict[str, Any], meeting_id: int) -> str:
        """Return a compact JSON string suitable for posting as an agent message."""
        return json.dumps(
            {
                "type": "summary",
                "meeting_id": meeting_id,
                "preview": summary_data.get("summary_text", "")[:240],
            }
        )

    def format_decisions_text(self, summary_data: dict[str, Any]) -> str:
        """Return a human-readable string of key decisions."""
        decisions = summary_data.get("key_decisions", [])
        if not decisions:
            return "No key decisions recorded."
        return "\n".join(f"• {d}" for d in decisions)

    def format_action_items_text(self, summary_data: dict[str, Any]) -> str:
        """Return a human-readable string of action items."""
        items = summary_data.get("action_items", [])
        if not items:
            return "No action items recorded."
        lines = []
        for item in items:
            owner = item.get("owner", "TBD")
            due = item.get("due_date", "TBD")
            text = item.get("item", "")
            lines.append(f"• [{owner} — {due}] {text}")
        return "\n".join(lines)
