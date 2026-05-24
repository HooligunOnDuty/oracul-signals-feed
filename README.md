# Oracul Signals Feed

Public website + JSON API that mirrors your local Oracul Agent signals. The agent stays on your Mac; a small sync script pushes sanitized JSON to Vercel Blob storage.

```
Mac (Oracul Agent)  →  sync script  →  Vercel /api/ingest  →  Blob
Friend's browser    ←  /api/feed (JSON) + homepage
```

Sensitive data (bankroll, live wallet balance, account keys) is **not** included in the public feed.

## 1. Deploy to Vercel

1. Push this folder to GitHub (or import directly in Vercel).
2. Create a [Vercel Blob store](https://vercel.com/docs/storage/vercel-blob) for the project.
3. In **Settings → Environment Variables**, set:

   | Variable | Where |
   |----------|--------|
   | `INGEST_SECRET` | Vercel only — long random string |
   | `BLOB_READ_WRITE_TOKEN` | Vercel only — from Blob store |

4. Deploy. Note your URL, e.g. `https://oracul-signals-feed.vercel.app`.

## 2. Local sync (your Mac)

While the Oracul agent is running (`npm run start` in ORACUL AGENT):

```bash
cd ~/Desktop/oracul-signals-feed
cp .env.example .env
npm install
```

Edit `.env`:

```env
AGENT_DASHBOARD_URL=http://127.0.0.1:3847
VERCEL_INGEST_URL=https://your-app.vercel.app/api/ingest
INGEST_SECRET=same-secret-as-vercel
SYNC_INTERVAL_MS=15000
```

Run sync:

```bash
npm run sync          # once
npm run sync:watch    # every 15s — keep this running
```

## 3. Share with your friend

- **Website:** `https://your-app.vercel.app`
- **Raw JSON:** `https://your-app.vercel.app/api/feed`

The page auto-refreshes every 15 seconds.

## API

### `GET /api/feed` (public)

Returns the latest sanitized feed JSON. No auth required.

### `POST /api/ingest` (private)

Used by the sync script only.

```http
Authorization: Bearer <INGEST_SECRET>
Content-Type: application/json

<body: raw agent /api/dashboard payload>
```

## Development

```bash
npm run dev     # http://localhost:3000
npm run build   # production build check
```

Without Blob configured locally, `/api/feed` returns an empty feed. Ingest requires `BLOB_READ_WRITE_TOKEN` and `INGEST_SECRET`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Agent dashboard 404/connection refused" | Start ORACUL AGENT with UI on port 3847 |
| "Unauthorized" on ingest | Match `INGEST_SECRET` in `.env` and Vercel |
| Stale data on site | Keep `npm run sync:watch` running |
| Empty feed after deploy | Run sync once after first deploy to seed Blob |
