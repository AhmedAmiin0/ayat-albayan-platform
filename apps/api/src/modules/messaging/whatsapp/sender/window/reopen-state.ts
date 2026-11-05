import type { Tables } from '@ab/db';
import { reopenDedupKey } from '@ab/shared';
import { UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';

// Which reopen template rows count (owner 2026-11-03, merge-gate review 2026-11-05): only one that
// is still pending or went out. A failed, expired or unsent one never stops the next try, so a
// held text never waits behind a template that will not reach the family.

/** One reopen template row (`reopen:` dedup key) as the window reads it. */
export type ReopenRow = Pick<
  Tables<'messages'>,
  'phone_e164' | 'status' | 'error_code' | 'expires_at' | 'created_at' | 'dedup_key'
>;

/** Reopen tries per phone per Riyadh day: a template failing again sends no more calls today. */
export const REOPEN_TRIES = 3;
/** One reopen per phone per 24 h: the reads' span, and each row's own life (expires_at). */
export const DAY_MS = 24 * 60 * 60_000;

const WENT_OUT = new Set<string>(['sent', 'delivered', 'read', 'sent_manually']);

const notPast = (expiresAt: string | null, now: Date): boolean =>
  expiresAt === null || Date.parse(expiresAt) > now.getTime();

/** Failed `uncertain` (timeout, dropped connection): it may have reached the family. */
const mayHaveGone = (r: ReopenRow): boolean => r.status === 'failed' && r.error_code === UNCERTAIN;

/** Still pending (queued, not past its expiry) or went out (or may have): no second one. */
export const reopenLive = (r: ReopenRow, now: Date): boolean =>
  WENT_OUT.has(r.status) || mayHaveGone(r) || (r.status === 'queued' && notPast(r.expires_at, now));

/** A live reopen among `rows` (the phone's rows of the last 24 h): nothing new is queued. */
export const reopenRequested = (rows: readonly ReopenRow[], now: Date): boolean =>
  rows.some((r) => reopenLive(r, now));

/**
 * The next try's dedup key today (`reopen:<E.164>:<day>`, then `:2`, `:3`), or null once today's
 * REOPEN_TRIES are used. `rows` hold every row of today (the Riyadh day began < 24 h ago).
 */
export function nextReopenKey(phone: string, rows: readonly ReopenRow[], now: Date): string | null {
  const day = reopenDedupKey(phone, now);
  const ofToday = (key: string | null): boolean => key === day || Boolean(key?.startsWith(`${day}:`));
  const tries = rows.filter((r) => ofToday(r.dedup_key)).length;
  return tries < REOPEN_TRIES ? reopenDedupKey(phone, now, tries + 1) : null;
}

/** A held row as the orphan check reads it: its phone and when its hold began. */
interface HeldRow {
  id: string;
  phone_e164: string;
  scheduled_for: string | null;
}

/**
 * Held rows with no live reopen of their phone made since 24 h before the hold began (the one the
 * hold asked for, or a later one): their template failed or expired unsent, so they fail now
 * (REOPEN_FAILED) instead of waiting 7 days for a reply nothing asked for. Not yet held: skipped.
 */
export function orphaned(
  held: readonly HeldRow[],
  reopens: readonly ReopenRow[],
  now: Date,
): string[] {
  const serves = (h: HeldRow, since: number) => (r: ReopenRow): boolean =>
    r.phone_e164 === h.phone_e164 && Date.parse(r.created_at) >= since && reopenLive(r, now);
  const served = (h: HeldRow, since: number): boolean => reopens.some(serves(h, since));
  return held
    .filter((h) => h.scheduled_for !== null && !served(h, Date.parse(h.scheduled_for) - DAY_MS))
    .map((h) => h.id);
}
