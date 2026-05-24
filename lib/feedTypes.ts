export type PublicSignalRow = {
  id: string;
  roundNumber: number;
  direction: "UP" | "DOWN";
  signalStrength: string;
  confidence: number | null;
  paperStatus: string | null;
  paperStakeUsd: number | null;
  paperEntryPrice: number | null;
  paperQuotePrice: number | null;
  paperPnlUsd: number | null;
  paperPayoutUsd: number | null;
  decidedAt: string;
  entryMode: string | null;
};

export type PublicActivityEntry = {
  at: string;
  level: string;
  message: string;
  detail: string | null;
};

export type PublicFeed = {
  updatedAt: string;
  agentName: string;
  modelVersion: string;
  enabled: boolean;
  activeRound: { roundNumber: number; status: string } | null;
  summary: {
    wins: number;
    losses: number;
    pending: number;
    realizedPnlUsd: number | null;
    roiPercent: number | null;
  };
  decisions: PublicSignalRow[];
  activityLogs: PublicActivityEntry[];
};

export type AgentDashboardPayload = {
  agentName?: string;
  modelVersion?: string;
  enabled?: boolean;
  activeRound?: { roundNumber: number; status: string } | null;
  summary?: {
    wins?: number;
    losses?: number;
    pending?: number;
  };
  paper?: {
    realizedPnlUsd?: number;
    roiPercent?: number;
  };
  decisions?: Array<{
    id: string;
    roundNumber: number;
    direction: "UP" | "DOWN";
    signalStrength?: string;
    confidence?: number | null;
    paperStatus?: string | null;
    paperStakeUsd?: number | null;
    paperEntryPrice?: number | null;
    paperQuotePrice?: number | null;
    paperPnlUsd?: number | null;
    paperPayoutUsd?: number | null;
    decidedAt: string;
    entryMode?: string | null;
  }>;
  activityLogs?: PublicActivityEntry[];
};

export const FEED_BLOB_PATH = "oracul/signals-feed.json";
