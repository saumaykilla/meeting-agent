import { WebhookReceiver } from "livekit-server-sdk";
import { NextResponse } from "next/server";

function parseMeetingRoom(roomName?: string) {
  if (!roomName) return null;
  const match = roomName.match(/^cc-(\d+)-(\d+)$/);
  if (!match) return null;
  return { companyId: match[1], meetingId: match[2] };
}

/**
 * Call a SpacetimeDB reducer via HTTP.
 * Uses a service token stored in SPACETIMEDB_SERVICE_TOKEN for authentication.
 */
async function callSpacetimeReducer(reducer: string, args: Record<string, unknown>) {
  const host = process.env.SPACETIMEDB_HOST ?? "https://maincloud.spacetimedb.com";
  const databaseName = process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ?? "cc-hackathon-db";
  const token = process.env.SPACETIMEDB_SERVICE_TOKEN;

  if (!token) {
    console.warn(`[webhook] SPACETIMEDB_SERVICE_TOKEN not set — skipping reducer call: ${reducer}`);
    return;
  }

  const url = `${host.replace(/\/$/, "")}/v1/database/${databaseName}/call/${reducer}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[webhook] SpacetimeDB reducer ${reducer} failed (${response.status}): ${text}`);
    throw new Error(`Reducer ${reducer} returned ${response.status}`);
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret || apiKey.startsWith("your_") || apiSecret.startsWith("your_")) {
    return NextResponse.json({ error: "LiveKit webhook credentials are not configured" }, { status: 500 });
  }

  let body: string;
  let authorization: string | null;

  try {
    body = await req.text();
    authorization = req.headers.get("Authorization");
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  if (!authorization) {
    return NextResponse.json({ error: "Missing LiveKit webhook signature" }, { status: 401 });
  }

  let event: Awaited<ReturnType<WebhookReceiver["receive"]>>;
  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    event = await receiver.receive(body, authorization);
  } catch (error) {
    console.error("[webhook] LiveKit signature verification failed:", error);
    const message = error instanceof Error ? error.message : "Invalid LiveKit webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const parsed = parseMeetingRoom(event.room?.name);

  if (!parsed) {
    // Room doesn't match cc-{companyId}-{meetingId} pattern — ignore
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { meetingId } = parsed;

  try {
    switch (event.event) {
      case "room_started":
        console.log(`[webhook] Room started — calling start_meeting for meeting ${meetingId}`);
        await callSpacetimeReducer("start_meeting", { meetingId: BigInt(meetingId).toString() });
        break;

      case "room_finished":
        console.log(`[webhook] Room finished — calling end_meeting for meeting ${meetingId}`);
        await callSpacetimeReducer("end_meeting", { meetingId: BigInt(meetingId).toString() });
        break;

      default:
        // Other events (participant_joined, etc.) — no action needed
        break;
    }
  } catch (reducerError) {
    // Log but don't fail the webhook response — LiveKit retries on non-200
    console.error("[webhook] Reducer call failed:", reducerError);
    return NextResponse.json(
      { ok: false, event: event.event, error: reducerError instanceof Error ? reducerError.message : "Reducer failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    event: event.event,
    meetingId: parsed.meetingId,
    companyId: parsed.companyId,
  });
}
