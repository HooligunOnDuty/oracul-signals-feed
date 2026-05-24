const ROUND_MS = 5 * 60 * 1000;

/** Format Oracul round window as `14:05–14:10 UTC` */
export function formatRoundWindowUtc(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  if (!startsAt) return "—";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "—";

  const end = endsAt
    ? new Date(endsAt)
    : new Date(start.getTime() + ROUND_MS);

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });

  if (Number.isNaN(end.getTime())) {
    return `${fmt(start)} UTC`;
  }

  return `${fmt(start)}–${fmt(end)} UTC`;
}

/** Infer 5m UTC window from signal time when round timestamps are missing (legacy feed). */
export function inferRoundWindowFromDecidedAt(decidedAt: string): {
  startsAt: string;
  endsAt: string;
} {
  const t = new Date(decidedAt).getTime();
  const startMs = Math.floor(t / ROUND_MS) * ROUND_MS;
  return {
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(startMs + ROUND_MS).toISOString(),
  };
}

export function resolveRowRoundWindow(row: {
  roundBettingStartsAt: string | null;
  roundEndsAt: string | null;
  decidedAt: string;
}): { startsAt: string; endsAt: string } {
  if (row.roundBettingStartsAt) {
    return {
      startsAt: row.roundBettingStartsAt,
      endsAt:
        row.roundEndsAt ??
        new Date(
          new Date(row.roundBettingStartsAt).getTime() + ROUND_MS,
        ).toISOString(),
    };
  }
  return inferRoundWindowFromDecidedAt(row.decidedAt);
}
