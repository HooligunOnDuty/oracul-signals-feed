import { head, put } from "@vercel/blob";
import type { PublicFeed } from "./feedTypes";
import { FEED_BLOB_PATH } from "./feedTypes";
import { emptyFeed } from "./sanitizeFeed";

export async function saveFeed(feed: PublicFeed): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set on Vercel");
  }

  await put(FEED_BLOB_PATH, JSON.stringify(feed), {
    access: "public",
    contentType: "application/json",
    token,
    addRandomSuffix: false,
  });
}

export async function loadFeed(): Promise<PublicFeed | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  try {
    const meta = await head(FEED_BLOB_PATH, { token });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicFeed;
  } catch {
    return null;
  }
}

export async function loadFeedOrEmpty(): Promise<PublicFeed> {
  return (await loadFeed()) ?? emptyFeed();
}
