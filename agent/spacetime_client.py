import json
import os

import aiohttp


class SpacetimeWriter:
    def __init__(self, company_id: int, meeting_id: int):
        self.company_id = company_id
        self.meeting_id = meeting_id
        self.host = os.getenv("SPACETIMEDB_HOST", "https://maincloud.spacetimedb.com").rstrip("/")
        self.module = os.getenv("SPACETIMEDB_MODULE", "cc-hackathon-db")
        self.token = os.getenv("SPACETIMEDB_SERVICE_TOKEN")

    async def _call_reducer(self, reducer: str, args: dict):
        if not self.token:
            raise RuntimeError("SPACETIMEDB_SERVICE_TOKEN is required for agent writes")
        url = f"{self.host}/v1/database/{self.module}/call/{reducer}"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                data=json.dumps(args),
            ) as response:
                if response.status >= 400:
                    raise RuntimeError(f"SpacetimeDB reducer {reducer} failed: {await response.text()}")

    async def store_summary(self, summary_text: str, key_decisions: str, action_items: str):
        await self._call_reducer(
            "store_meeting_summary",
            {
                "meetingId": self.meeting_id,
                "companyId": self.company_id,
                "summaryText": summary_text,
                "keyDecisions": key_decisions,
                "actionItems": action_items,
            },
        )

    async def post_agent_message(self, content: str, channel_type: str, channel_id: int):
        await self._call_reducer(
            "post_agent_message",
            {
                "content": content,
                "channelType": channel_type,
                "channelId": channel_id,
                "companyId": self.company_id,
            },
        )

    async def mark_summary_indexed(self, summary_id: int):
        """Mark a meeting summary as indexed in Pinecone."""
        await self._call_reducer(
            "mark_summary_indexed",
            {"summaryId": summary_id},
        )

    async def get_summary_id(self) -> int | None:
        """Fetch the most recent summary for this meeting via HTTP SQL query."""
        if not self.token:
            return None
        url = f"{self.host}/v1/database/{self.module}/sql"
        query = (
            f"SELECT id FROM meeting_summary "
            f"WHERE meeting_id = {self.meeting_id} AND company_id = {self.company_id} "
            f"ORDER BY generated_at DESC LIMIT 1"
        )
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                json={"query": query},
            ) as response:
                if response.status >= 400:
                    return None
                data = await response.json()
                rows = data[0].get("rows", []) if data else []
                if rows:
                    return int(rows[0][0])
                return None
