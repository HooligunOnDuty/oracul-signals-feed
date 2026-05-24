"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicFeed, PublicSignalRow } from "@/lib/feedTypes";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatUsd(n: number | null | undefined, signed = false): string {
  if (n == null || Number.isNaN(n)) return "—";
  const prefix = signed && n > 0 ? "+" : "";
  return `${prefix}$${n.toFixed(2)}`;
}

function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(1)}%`;
}

function signalBadgeClass(strength: string): string {
  const s = strength.toLowerCase();
  if (s.includes("strong")) return "strong";
  if (s.includes("standard")) return "standard";
  if (s.includes("weak")) return "weak";
  if (s.includes("late")) return "late";
  return "unknown";
}

function paperStatusLabel(status: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

function FeedPage() {
  const [feed, setFeed] = useState<PublicFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/feed", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PublicFeed;
      setFeed(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load]);

  const updatedAt = feed?.updatedAt ? formatTime(feed.updatedAt) : "—";
  const isStale =
    feed?.updatedAt &&
    Date.now() - new Date(feed.updatedAt).getTime() > 120_000;

  return (
    <main className="page">
      <header className="header">
        <div className="title-block">
          <h1>{feed?.agentName ?? "Oracul Signals"}</h1>
          <p className="subtitle">
            Model {feed?.modelVersion ?? "—"} · Last sync {updatedAt}
            {isStale ? " (stale — is sync running?)" : ""}
          </p>
        </div>
        <div className="status-row">
          <span className={`pill ${feed?.enabled ? "on" : "off"}`}>
            <span className="dot" />
            {feed?.enabled ? "Agent on" : "Agent off"}
          </span>
          {feed?.activeRound && (
            <span className="pill">
              Round #{feed.activeRound.roundNumber} · {feed.activeRound.status}
            </span>
          )}
          <button type="button" className="refresh-btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <p style={{ color: "var(--red)", marginBottom: 16 }}>{error}</p>
      )}

      <section className="stats">
        <div className="stat-card">
          <div className="stat-label">Wins</div>
          <div className="stat-value">{feed?.summary.wins ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Losses</div>
          <div className="stat-value">{feed?.summary.losses ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{feed?.summary.pending ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paper P&amp;L</div>
          <div
            className={`stat-value ${
              (feed?.summary.realizedPnlUsd ?? 0) >= 0 ? "positive" : "negative"
            }`}
          >
            {formatUsd(feed?.summary.realizedPnlUsd, true)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paper ROI</div>
          <div
            className={`stat-value ${
              (feed?.summary.roiPercent ?? 0) >= 0 ? "positive" : "negative"
            }`}
          >
            {formatPct(feed?.summary.roiPercent)}
          </div>
        </div>
      </section>

      <h2 className="section-title">Recent signals</h2>
      <div className="table-wrap">
        {loading && !feed ? (
          <div className="empty">Loading…</div>
        ) : !feed?.decisions.length ? (
          <div className="empty">
            No signals yet. Run the sync script while your agent is active.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Direction</th>
                <th>Signal</th>
                <th>Conf</th>
                <th>Paper</th>
                <th>Stake</th>
                <th>P&amp;L</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {feed.decisions.map((row: PublicSignalRow) => (
                <tr key={row.id}>
                  <td>#{row.roundNumber}</td>
                  <td
                    className={
                      row.direction === "UP" ? "dir-up" : "dir-down"
                    }
                  >
                    {row.direction}
                  </td>
                  <td>
                    <span
                      className={`badge ${signalBadgeClass(row.signalStrength)}`}
                    >
                      {row.signalStrength}
                    </span>
                  </td>
                  <td>
                    {row.confidence != null
                      ? `${(row.confidence * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td>{paperStatusLabel(row.paperStatus)}</td>
                  <td>{formatUsd(row.paperStakeUsd)}</td>
                  <td
                    className={
                      (row.paperPnlUsd ?? 0) >= 0 ? "pnl-pos" : "pnl-neg"
                    }
                  >
                    {formatUsd(row.paperPnlUsd, true)}
                  </td>
                  <td>{formatTime(row.decidedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feed?.activityLogs && feed.activityLogs.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Activity
          </h2>
          <ul className="log-list">
            {feed.activityLogs.map((log, i) => (
              <li key={`${log.at}-${i}`}>
                <span className="log-time">{formatTime(log.at)}</span>
                <span
                  className={
                    log.level === "warn"
                      ? "log-level-warn"
                      : log.level === "error"
                        ? "log-level-error"
                        : undefined
                  }
                >
                  {log.message}
                </span>
                {log.detail ? (
                  <span style={{ color: "var(--muted)" }}> — {log.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="footer-note">
        Public feed — no wallet or bankroll data. JSON:{" "}
        <a href="/api/feed" target="_blank" rel="noreferrer">
          /api/feed
        </a>
      </p>
    </main>
  );
}

export default FeedPage;
