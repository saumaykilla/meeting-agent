import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { roomName, participantName, participantId } = await req.json();

    if (!roomName || !participantName || !participantId) {
      return NextResponse.json(
        { error: "roomName, participantName, and participantId are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || apiKey.startsWith("your_") || apiSecret.startsWith("your_")) {
      return NextResponse.json(
        { error: "LiveKit credentials are not configured" },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: String(participantId),
      name: String(participantName),
    });

    token.addGrant({
      room: String(roomName),
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({ token: await token.toJwt(), url: livekitUrl });
  } catch (error) {
    console.error("LiveKit token error:", error);
    const message = error instanceof Error ? error.message : "Failed to create LiveKit token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
