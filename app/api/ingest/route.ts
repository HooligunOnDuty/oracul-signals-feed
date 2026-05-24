import { NextResponse } from "next/server";
import { sanitizeAgentPayload } from "@/lib/sanitizeFeed";
import { saveFeed } from "@/lib/storage";
import type { AgentDashboardPayload } from "@/lib/feedTypes";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "INGEST_SECRET not configured on Vercel" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  let raw: AgentDashboardPayload;
  try {
    raw = (await req.json()) as AgentDashboardPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const feed = sanitizeAgentPayload(raw);

  try {
    await saveFeed(feed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updatedAt: feed.updatedAt,
    decisions: feed.decisions.length,
  });
}
