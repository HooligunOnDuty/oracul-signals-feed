/**
 * Pulls dashboard JSON from the local Oracul agent and POSTs to Vercel /api/ingest.
 *
 * Usage:
 *   cp .env.example .env   # fill VERCEL_INGEST_URL + INGEST_SECRET
 *   npm run sync           # one shot
 *   npm run sync:watch     # poll every SYNC_INTERVAL_MS (default 15s)
 */

const AGENT_URL =
  process.env.AGENT_DASHBOARD_URL?.trim() ||
  "http://127.0.0.1:3847";
const INGEST_URL = process.env.VERCEL_INGEST_URL?.trim();
const SECRET = process.env.INGEST_SECRET?.trim();
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

  const ingestRes = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET}`,
    },
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
