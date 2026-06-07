from dotenv import load_dotenv
load_dotenv()

import os

import asyncio
from livekit import agents
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli

from pipeline import CCAgentPipeline


def parse_room_name(room_name: str) -> tuple[int, int]:
    parts = room_name.split("-")
    if len(parts) != 3 or parts[0] != "cc":
        raise ValueError(f"Unsupported room name: {room_name}")
    return int(parts[1]), int(parts[2])


async def entrypoint(ctx: JobContext):
    company_id, meeting_id = parse_room_name(ctx.room.name)

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    pipeline = CCAgentPipeline(
        ctx=ctx,
        company_id=company_id,
        meeting_id=meeting_id,
    )
    await pipeline.run()


if __name__ == "__main__":
    if not os.getenv("GOOGLE_CLOUD_PROJECT"):
        print("\n❌ ERROR: GOOGLE_CLOUD_PROJECT is not set in your environment variables.")
        print("   Please add a valid GCP Project ID to your agent/.env file.\n")
        import sys
        sys.exit(1)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
