import { NextResponse } from "next/server";
import { loadFeedOrEmpty } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await loadFeedOrEmpty();
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
