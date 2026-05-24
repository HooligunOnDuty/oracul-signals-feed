import type { AgentDashboardPayload, PublicFeed } from "./feedTypes";

/** Strip bankroll / live wallet details — friend-safe public feed. */
export function sanitizeAgentPayload(raw: AgentDashboardPayload): PublicFeed {
  const decisions = (raw.decisions ?? []).map((d) => ({
    id: d.id,
    roundNumber: d.roundNumber,
    direction: d.direction,
    signalStrength: d.signalStrength ?? "unknown",
    confidence: d.confidence ?? null,
    paperStatus: d.paperStatus ?? null,
    paperStakeUsd: d.paperStakeUsd ?? null,
    paperEntryPrice: d.paperEntryPrice ?? null,
    paperQuotePrice: d.paperQuotePrice ?? null,
    paperPnlUsd: d.paperPnlUsd ?? null,
    paperPayoutUsd: d.paperPayoutUsd ?? null,
    decidedAt: d.decidedAt,
    entryMode: d.entryMode ?? null,
  }));

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
