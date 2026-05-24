/**
 * Pulls dashboard JSON from the local Oracul agent and POSTs to Vercel /api/ingest.
 *
 * Usage:
 *   cp .env.example .env   # in project root (not app/)
 *   npm run sync           # one shot
 *   npm run sync:watch     # poll every SYNC_INTERVAL_MS (default 15s)
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Node does not load .env automatically — read project root .env */
function loadEnvFile(): void {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const AGENT_URL =
  process.env.AGENT_DASHBOARD_URL?.trim() ||
  "http://127.0.0.1:3847";
const INGEST_URL = process.env.VERCEL_INGEST_URL?.trim();
const SECRET = process.env.INGEST_SECRET?.trim();
const PROTECTION_BYPASS = process.env.VERCEL_PROTECTION_BYPASS?.trim();
const INTERVAL_MS = Number.parseInt(
  process.env.SYNC_INTERVAL_MS ?? "15000",
  10,
);

async function syncOnce(): Promise<void> {
  if (!INGEST_URL) {
    throw new Error("VERCEL_INGEST_URL is not set in .env");
  }
  if (!SECRET) {
    throw new Error("INGEST_SECRET is not set in .env");
  }

  const dashboardUrl = `${AGENT_URL.replace(/\/$/, "")}/api/dashboard?page=1&pageSize=50`;
  const agentRes = await fetch(dashboardUrl, { cache: "no-store" });

  if (!agentRes.ok) {
    throw new Error(
      `Agent dashboard ${agentRes.status} — is the agent running at ${AGENT_URL}?`,
    );
  }

  const payload = await agentRes.json();

  const ingestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SECRET}`,
  };
  if (PROTECTION_BYPASS) {
    ingestHeaders["x-vercel-protection-bypass"] = PROTECTION_BYPASS;
  }

  const ingestRes = await fetch(INGEST_URL, {
    method: "POST",
    headers: ingestHeaders,
    body: JSON.stringify(payload),
  });

  const body = await ingestRes.text();
  let parsed: { ok?: boolean; error?: string; decisions?: number; updatedAt?: string };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    parsed = {};
  }

  if (!ingestRes.ok) {
    if (body.includes("Authentication Required")) {
      throw new Error(
        "Vercel Deployment Protection blocked the request. Use your production URL " +
          "(https://your-app.vercel.app/api/ingest, not the git-main-... preview URL), " +
          "or set VERCEL_PROTECTION_BYPASS in .env from Vercel → Settings → Deployment Protection.",
      );
    }
    throw new Error(
      `Ingest ${ingestRes.status}: ${parsed.error ?? body.slice(0, 200)}`,
    );
  }

  const ts = new Date().toISOString();
  console.log(
    `[${ts}] synced ${parsed.decisions ?? "?"} decisions → ${INGEST_URL}`,
  );
}

async function main(): Promise<void> {
  const watch = process.argv.includes("--watch");

  const run = async () => {
    try {
      await syncOnce();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] sync failed: ${msg}`);
    }
  };

  await run();

  if (watch) {
    const ms = Number.isFinite(INTERVAL_MS) && INTERVAL_MS >= 5000 ? INTERVAL_MS : 15000;
    console.log(`Watching every ${ms}ms (Ctrl+C to stop)`);
    setInterval(() => void run(), ms);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
