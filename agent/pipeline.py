import asyncio
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

from livekit import rtc
from livekit.agents import JobContext, Agent, AgentSession, llm, room_io
from livekit.plugins import google

from gemini_client import GeminiClient
from rag import PineconeRAG
from spacetime_client import SpacetimeWriter
from summarizer import MeetingSummarizer


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
        instructions = f"""You are CC Assistant, a helpful AI participant in this meeting.
Your primary role is to listen to the participants, answer questions when asked, and recall relevant context from past meetings.

If the user asks about past decisions, timelines, or context from previous meetings, use the `search_past_meetings` tool to find the information.
Be concise, conversational, and direct in your audio responses. Avoid emojis, markdown formatting, or list syntax.

If a user types a message in the chat asking about an issue or asking a question, you MUST type your response back using the `send_chat_message` tool IN ADDITION TO speaking your answer aloud.

Current company_id: {self.company_id}
Current meeting_id: {self.meeting_id}
"""

        # 2. Define function tool for Pinecone RAG lookup
        @llm.function_tool(
            name="search_past_meetings",
            description="Search past meeting transcripts and summaries for relevant historical context."
        )
        async def search_past_meetings(query: str) -> str:
            try:
                results = await self.rag.query(query, top_k=3)
                if not results:
                    return "No past meeting context found matching this query."
                
                context = []
                for r in results:
                    chunk = r.metadata.get("chunk_text", "")
                    meeting_id = r.metadata.get("meeting_id", "Unknown")
                    summary = r.metadata.get("summary", "")
                    context.append(f"[Meeting #{meeting_id} Chunk]\n{chunk}\n[Summary Context]\n{summary}")
                
                return "\n\n---\n\n".join(context)
            except Exception as e:
                return f"Error searching past meetings: {str(e)}"

        # 3. Initialize Agent with tools
        @llm.function_tool(
            name="send_chat_message",
            description="Send a text message back to the meeting chat. Use this when the user asks a question via chat or requests you to provide a written response."
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
                temperature=0.8,
                model="gemini-live-2.5-flash-native-audio",
                vertexai=True,
                project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
                location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
            ),
            turn_detection="realtime_llm",
            preemptive_generation=True,
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
                        # Force the LLM to generate a reply using the chat text
                        asyncio.create_task(session.generate_reply(user_input=content))
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
            speaker = "User" if msg.role == "user" else "CC Assistant"
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
