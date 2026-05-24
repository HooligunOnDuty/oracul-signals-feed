"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicFeed, PublicSignalRow } from "@/lib/feedTypes";
import {
  formatRoundWindowUtc,
  resolveRowRoundWindow,
} from "@/lib/roundTiming";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
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

  const activeWindow = feed?.activeRound
    ? formatRoundWindowUtc(
        feed.activeRound.bettingStartsAt,
        feed.activeRound.endsAt,
      )
    : null;

  return (
    <main className="page">
      <header className="header">
        <div className="title-block">
          <p className="eyebrow">Oracul Agent · Public feed</p>
          <h1>{feed?.agentName ?? "Oracul Signals"}</h1>
          <p className="subtitle">
            Model {feed?.modelVersion ?? "—"} · Last sync {updatedAt} UTC
            {isStale ? " · sync may be offline" : ""}
          </p>
        </div>
        <div className="header-actions">
          <span className={`status-pill ${feed?.enabled ? "live" : "off"}`}>
            <span className="status-dot" />
            {feed?.enabled ? "Agent active" : "Agent offline"}
          </span>
          {feed?.activeRound && (
            <span className="status-pill neutral">
              Round #{feed.activeRound.roundNumber}
              <span className="pill-sep">·</span>
              {activeWindow}
              <span className="pill-sep">·</span>
              {feed.activeRound.status}
            </span>
          )}
          <button type="button" className="btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="stats">
        <div className="stat-card">
          <span className="stat-label">Wins</span>
          <span className="stat-value">{feed?.summary.wins ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Losses</span>
          <span className="stat-value">{feed?.summary.losses ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{feed?.summary.pending ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Paper P&amp;L</span>
          <span
            className={`stat-value ${
              (feed?.summary.realizedPnlUsd ?? 0) >= 0 ? "positive" : "negative"
            }`}
          >
            {formatUsd(feed?.summary.realizedPnlUsd, true)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Paper ROI</span>
          <span
            className={`stat-value ${
              (feed?.summary.roiPercent ?? 0) >= 0 ? "positive" : "negative"
            }`}
          >
            {formatPct(feed?.summary.roiPercent)}
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent signals</h2>
          <span className="panel-meta">Auto-refresh 15s</span>
        </div>
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
                  <th>Window (UTC)</th>
                  <th>Direction</th>
                  <th>Signal</th>
                  <th>Conf</th>
                  <th>Paper</th>
                  <th>Stake</th>
                  <th>P&amp;L</th>
                  <th>Logged (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {feed.decisions.map((row: PublicSignalRow) => {
                  const window = resolveRowRoundWindow(row);
                  return (
                    <tr key={row.id}>
                      <td className="round-num">#{row.roundNumber}</td>
                      <td className="muted">
                        {formatRoundWindowUtc(window.startsAt, window.endsAt)}
                      </td>
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
                      <td className="muted">
                        {paperStatusLabel(row.paperStatus)}
                        {row.simAccounts > 1 ? ` · ${row.simAccounts} accts` : ""}
                      </td>
                      <td>{formatUsd(row.paperStakeUsd)}</td>
                      <td
                        className={
                          (row.paperPnlUsd ?? 0) >= 0 ? "pnl-pos" : "pnl-neg"
                        }
                      >
                        {formatUsd(row.paperPnlUsd, true)}
                      </td>
                      <td className="muted">{formatTime(row.decidedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {feed?.activityLogs && feed.activityLogs.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Activity</h2>
          </div>
          <ul className="log-list">
            {feed.activityLogs.map((log, i) => (
              <li key={`${log.at}-${i}`}>
                <span className="log-time">{formatTime(log.at)}</span>
                <span
                  className={
                    log.level === "warn"
                      ? "log-warn"
                      : log.level === "error"
                        ? "log-err"
                        : ""
                  }
                >
                  {log.message}
                </span>
                {log.detail ? (
                  <span className="log-detail"> — {log.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">
        Public feed — no wallet or bankroll data.{" "}
        <a href="/api/feed" target="_blank" rel="noreferrer">
          JSON feed
        </a>
      </footer>
    </main>
  );
}

export default FeedPage;
