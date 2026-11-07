import { Logger } from '@nestjs/common';

// docs/42 42-2: one line per outbound call, `{evt:'http', where, status, ms}`. `where` is whereOf's
// «profile METHOD /path» (never the host or the query), with every id-like segment masked.

const log = new Logger('Http');

/** Slower than this: a warning (the Kapso send itself is ~1.5 s, so it shows up). */
export const SLOW_HTTP_MS = 1_000;

/** A path segment with 5+ digits (a phone number id, a phone, a message id) → `:id`. */
const ID_LIKE = /\/[^/\s]*\d{5,}[^/\s]*/g;

export const maskedWhere = (where: string): string => where.replace(ID_LIKE, '/:id');

interface HttpTiming {
  where: string;
  /** null = no response (network error, timeout). */
  status: number | null;
  ms: number;
}

export const httpLine = (t: HttpTiming): string =>
  JSON.stringify({ evt: 'http', where: maskedWhere(t.where), status: t.status, ms: t.ms });

const LEVEL: Record<'fast' | 'slow', (line: string) => void> = {
  fast: (line) => log.debug(line),
  slow: (line) => log.warn(line),
};

export function reportHttp(t: HttpTiming): void {
  LEVEL[t.ms > SLOW_HTTP_MS ? 'slow' : 'fast'](httpLine(t));
}

/** Runs one call and logs its timing whatever the outcome; `seen` records the response status. */
export async function timed<T>(
  where: string,
  work: (seen: (status: number) => void) => Promise<T>,
): Promise<T> {
  const started = performance.now();
  const got: { status: number | null } = { status: null };
  try {
    return await work((status) => {
      got.status = status;
    });
  } finally {
    reportHttp({ where, status: got.status, ms: Math.round(performance.now() - started) });
  }
}
