import type { AgentDashboardPayload, PublicFeed, PublicSignalRow } from "./feedTypes";

function baseDecisionId(id: string): string {
  return id.split("#")[0] ?? id;
}

function mergeStatus(statuses: string[]): string {
  if (statuses.length === 0) return "unknown";
  if (statuses.every((s) => s === "unfilled")) return "unfilled";
  if (statuses.some((s) => s === "open" || s === "partial")) return "partial";
  if (statuses.every((s) => s === "win")) return "win";
  if (statuses.every((s) => s === "loss")) return "loss";
  if (statuses.some((s) => s === "win")) return "mixed";
  if (statuses.some((s) => s === "loss")) return "mixed";
  return statuses[0] ?? "unknown";
}

/** Collapse per-account dashboard rows into one public signal per Oracul decision. */
function mergeDecisionRows(
  raw: NonNullable<AgentDashboardPayload["decisions"]>,
): PublicSignalRow[] {
  const groups = new Map<string, NonNullable<AgentDashboardPayload["decisions"]>>();

  for (const row of raw) {
    const key = baseDecisionId(row.id);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const merged: PublicSignalRow[] = [];

  for (const [baseId, rows] of groups) {
    const head = rows[0]!;
    const statuses = rows.map((r) => r.paperStatus ?? "unknown");
    const stakeSum = rows.reduce((s, r) => s + (r.paperStakeUsd ?? 0), 0);
    const pnlValues = rows
      .map((r) => r.paperPnlUsd)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const pnlSum =
      pnlValues.length > 0
        ? pnlValues.reduce((s, v) => s + v, 0)
        : null;

    merged.push({
      id: baseId,
      roundNumber: head.roundNumber,
      roundBettingStartsAt: head.roundBettingStartsAt ?? null,
      roundEndsAt: head.roundEndsAt ?? null,
      direction: head.direction,
      signalStrength: head.signalStrength ?? "unknown",
      confidence: head.confidence ?? null,
      paperStatus: mergeStatus(statuses),
      paperStakeUsd: stakeSum > 0 ? stakeSum : null,
      paperEntryPrice: head.paperEntryPrice ?? null,
      paperQuotePrice: head.paperQuotePrice ?? null,
      paperPnlUsd: pnlSum,
      paperPayoutUsd: null,
      decidedAt: head.decidedAt,
      entryMode: head.entryMode ?? null,
      simAccounts: rows.length,
    });
  }

  merged.sort(
    (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime(),
  );

  return merged;
}

/** Strip bankroll / live wallet details — friend-safe public feed. */
export function sanitizeAgentPayload(raw: AgentDashboardPayload): PublicFeed {
  const decisions = mergeDecisionRows(raw.decisions ?? []);

  return {
    updatedAt: new Date().toISOString(),
    agentName: raw.agentName ?? "Oracul Agent",
    modelVersion: raw.modelVersion ?? "—",
    enabled: raw.enabled ?? false,
    activeRound: raw.activeRound ?? null,
    summary: {
      wins: raw.summary?.wins ?? 0,
      losses: raw.summary?.losses ?? 0,
      pending: raw.summary?.pending ?? 0,
      realizedPnlUsd: raw.paper?.realizedPnlUsd ?? null,
      roiPercent: raw.paper?.roiPercent ?? null,
    },
    decisions,
    activityLogs: (raw.activityLogs ?? []).slice(0, 40),
  };
}

export function emptyFeed(): PublicFeed {
  return {
    updatedAt: new Date(0).toISOString(),
    agentName: "Oracul Agent",
    modelVersion: "—",
    enabled: false,
    activeRound: null,
    summary: {
      wins: 0,
      losses: 0,
      pending: 0,
      realizedPnlUsd: null,
      roiPercent: null,
    },
    decisions: [],
    activityLogs: [],
  };
}
