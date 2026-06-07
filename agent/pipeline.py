import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

from livekit import rtc
from livekit.agents import JobContext, Agent, AgentSession, llm, room_io # type: ignore
from livekit.plugins import google

from gemini_client import GeminiClient
from rag import PineconeRAG
from spacetime_client import SpacetimeWriter
from summarizer import MeetingSummarizer


AGENT_NAME = "CC"
MIN_RAG_MATCH_SCORE = float(os.getenv("CC_RAG_MIN_SCORE", "0.45"))


class CCAgentPipeline:
    def __init__(self, ctx: JobContext, company_id: int, meeting_id: int):
        self.ctx = ctx
        self.company_id = company_id
        self.meeting_id = meeting_id
        self.start_time = 0.0

        self.gemini = GeminiClient()
        self.rag = PineconeRAG(company_id=company_id, gemini=self.gemini)
        self.spacetime = SpacetimeWriter(company_id=company_id, meeting_id=meeting_id)
        self.summarizer = MeetingSummarizer(gemini=self.gemini)

    async def run(self):
        # 1. Define LLM instructions
        instructions = f"""Your name is {AGENT_NAME}. You are an AI meeting participant with company memory.

Your default behavior is to silently listen. Speak only in these situations:
1. Someone addresses you directly by saying or writing "CC", "@CC", "hey CC", or an equivalent direct address.
2. The team is discussing a concrete problem, solution, decision, timeline, blocker, or open question that appears to have already been discussed in past meetings and your retrieved context confirms that you know something relevant.

Do not answer ordinary meeting conversation, rhetorical comments, status updates, or side chatter. If you are not directly addressed and you do not have relevant past-meeting context, stay silent.

When directly addressed, answer the request. If the request asks about past decisions, timelines, owners, blockers, or previous discussion, use the `search_past_meetings` tool before answering.

When the team appears to be re-discussing an already-covered problem or solution, first use the `search_past_meetings` tool. Interject only if the result is clearly relevant. Keep the interjection brief and useful, for example by naming the prior solution, decision, owner, blocker, or next step. If the search result is weak or unrelated, stay silent.

Be concise, conversational, and direct in audio responses. Avoid emojis, markdown formatting, or list syntax.

If a user directly addresses you in meeting chat, you MUST type your response back using the `send_chat_message` tool in addition to speaking your answer aloud.

Current company_id: {self.company_id}
Current meeting_id: {self.meeting_id}
"""

        # 2. Define function tool for Pinecone RAG lookup
        @llm.function_tool(
            name="search_past_meetings",
            description="Search past meeting transcripts and summaries before answering historical questions or interjecting about a repeated problem or solution."
        )
        async def search_past_meetings(query: str) -> str:
            try:
                return await self._search_relevant_past_meeting_context(query)
            except Exception as e:
                return f"Error searching past meetings: {str(e)}"

        # 3. Initialize Agent with tools
        @llm.function_tool(
            name="send_chat_message",
            description="Send a text response back to meeting chat. Use only when a chat message directly addresses CC or asks CC for a written response."
        )
        async def send_chat_message(content: str) -> str:
            try:
                await self.spacetime.post_agent_message(
                    content,
                    "MeetingThread",
                    self.meeting_id,
                )
                return "Successfully sent message to chat."
            except Exception as e:
                return f"Error sending chat message: {str(e)}"

        agent = Agent(
            instructions=instructions,
            tools=[search_past_meetings, send_chat_message]
        )

        # 4. Configure AgentSession using the Google Gemini Realtime Model
        session = AgentSession(
            llm=google.realtime.RealtimeModel(
                voice="Zephyr",
                temperature=0.3,
                model='gemini-2.5-flash-native-audio-preview-12-2025',
            ),
            turn_detection="realtime_llm",
            preemptive_generation=False,
        )

        # 5. Register async shutdown callback to process transcript, summary, and indexing
        async def _persist_session() -> None:
            await self._on_meeting_end(session)

        self.ctx.add_shutdown_callback(_persist_session)

        @self.ctx.room.on("data_received")
        def on_data_received(dp: rtc.DataPacket):
            try:
                # The data packet payload is in dp.data
                payload = json.loads(dp.data.decode("utf-8"))
                if payload.get("type") == "chat":
                    content = payload.get("content", "")
                    if content:
                        print(f"Received chat from user: {content}")
                        if self._is_addressed_to_cc(content):
                            asyncio.create_task(session.generate_reply(user_input=content))
                        elif self._should_check_chat_for_context(content):
                            asyncio.create_task(self._maybe_respond_to_contextual_chat(session, content))
                        else:
                            print("Ignoring chat message because it does not look like a repeated problem or solution.")
            except Exception:
                pass

        # 6. Start the session in the room
        self.start_time = time.monotonic()
        await session.start(
            agent=agent,
            room=self.ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(),
                video_input=False,
            )
        )

        # Wait for the session to run until cancellation
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    async def _on_meeting_end(self, session: AgentSession):
        # Extract and format the raw transcript from session history
        transcript = []
        for msg in session.history.messages():
            text = msg.text_content or ""
            if not text.strip():
                continue
            speaker = "User" if msg.role == "user" else AGENT_NAME
            transcript.append({
                "speaker": speaker,
                "text": text.strip(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        if not transcript:
            print(f"Meeting {self.meeting_id} ended with no transcript — skipping summary.")
            return

        try:
            print(f"Meeting {self.meeting_id} ended. Generating summary...")

            # 1. Generate structured summary via Gemini Pro
            summary_data = await self.summarizer.summarize(transcript)

            # 2. Write summary to SpacetimeDB
            await self.spacetime.store_summary(
                summary_text=summary_data["summary_text"],
                key_decisions=json.dumps(summary_data.get("key_decisions", [])),
                action_items=json.dumps(summary_data.get("action_items", [])),
            )

            # 3. Post summary preview as meeting thread message
            await self.spacetime.post_agent_message(
                self.summarizer.format_for_message(summary_data, self.meeting_id),
                "MeetingThread",
                self.meeting_id,
            )

            # 4. Index transcript + summary in Pinecone
            await self.rag.index_meeting(self.meeting_id, transcript, summary_data)

            # 5. Mark the summary as indexed in SpacetimeDB
            try:
                summary_id = await self.spacetime.get_summary_id()
                if summary_id is not None:
                    await self.spacetime.mark_summary_indexed(summary_id)
                    print(f"Summary {summary_id} marked as Pinecone-indexed in SpacetimeDB.")
            except Exception as mark_err:
                print(f"Could not mark summary as indexed: {mark_err}")

            print(f"Meeting {self.meeting_id} processed successfully.")
        except Exception as error:
            print(f"Meeting end processing failed: {error}")

    async def _search_relevant_past_meeting_context(self, query: str) -> str:
        results = await self.rag.query(query, top_k=3)
        relevant_results = [
            result for result in results
            if result.score >= MIN_RAG_MATCH_SCORE
        ]
        if not relevant_results:
            return "No past meeting context found matching this query."

        context = []
        for r in relevant_results:
            chunk = r.metadata.get("chunk_text", "")
            meeting_id = r.metadata.get("meeting_id", "Unknown")
            summary = r.metadata.get("summary", "")
            context.append(
                f"[Meeting #{meeting_id} | relevance {r.score:.2f}]\n"
                f"{chunk}\n[Summary Context]\n{summary}"
            )

        return "\n\n---\n\n".join(context)

    async def _maybe_respond_to_contextual_chat(self, session: AgentSession, content: str) -> None:
        try:
            context = await self._search_relevant_past_meeting_context(content)
            if context.startswith("No past meeting context found"):
                print("Ignoring chat message because no relevant past meeting context was found.")
                return

            await session.generate_reply(
                user_input=(
                    "Participants are discussing this in meeting chat without directly addressing CC:\n"
                    f"{content}\n\n"
                    "Relevant past meeting context was found:\n"
                    f"{context}\n\n"
                    "Briefly interject in the meeting only if this helps the team avoid re-discussing an already covered solution, decision, owner, blocker, or next step. "
                    "Do not use send_chat_message unless someone directly asked CC for a written response."
                )
            )
        except Exception as error:
            print(f"Contextual chat response failed: {error}")

    def _is_addressed_to_cc(self, text: str) -> bool:
        normalized = text.strip().lower()
        if not normalized:
            return False

        direct_address_patterns = (
            r"^@?cc\b",
            r"\s@cc\b",
            r"\b(?:hey|hi|hello|ok|okay)\s+@?cc\b",
            r"[,;:]\s*@?cc[?.!]*$",
            r"\b@?cc[?.!]*$",
        )
        return any(re.search(pattern, normalized) for pattern in direct_address_patterns)

    def _should_check_chat_for_context(self, text: str) -> bool:
        normalized = text.strip().lower()
        if len(normalized.split()) < 4:
            return False

        discussion_patterns = (
            r"\bticket\s*#?\d+\b",
            r"\b(issue|bug|blocker|problem|solution|decision|timeline|owner|next step)\b",
            r"\b(repo|repository|service|api|database|schema|migration|deployment)\b",
            r"\b(need to|should|we can|we need|i think|let's|lets|create|build|implement|fix|ship)\b",
            r"\b(last time|previously|already|decided|agreed|discussed)\b",
        )
        return any(re.search(pattern, normalized) for pattern in discussion_patterns)
