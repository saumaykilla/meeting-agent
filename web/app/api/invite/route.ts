import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email, token, companyName } = await req.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const setupUrl = `${appUrl.replace(/\/$/, "")}/setup?token=${encodeURIComponent(token)}`;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CC Meeting Agent <onboarding@resend.dev>",
      to: [email],
      subject: `You have been invited to join ${companyName || "your company"} on CC`,
      html: `
        <div>
          <h1>Welcome to CC!</h1>
          <p>You have been invited to join <strong>${companyName || "your company"}</strong>.</p>
          <p>Click the link below to set up your account and join the workspace.</p>
          <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2F2F2F; color: white; text-decoration: none; border-radius: 6px;">
            Join Workspace
          </a>
          <p>Or copy this link: <br/> <a href="${setupUrl}">${setupUrl}</a></p>
        </div>
      `,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Resend failed to send the invite email", details: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error("Resend error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
