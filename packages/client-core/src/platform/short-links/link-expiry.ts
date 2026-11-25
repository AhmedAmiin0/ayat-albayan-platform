import type { ShortLinkRow } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';
import { SETTING_DEFAULTS } from '@ab/settings';
import { addDaysIn, calendarDaysBetween, localDateIn } from '@ab/time';
import { fillSlots } from '../../teaching/reports';

// An ended link is deleted with its visits short_link_purge_days after expiry (docs/19 Cron).

/** Mirrors the seeded short_link_purge_days setting (30). */
export const SHORT_LINK_PURGE_DAYS = SETTING_DEFAULTS.short_link_purge_days;

export interface ExpiryClock {
  now: Date;
  /** The viewer's zone (calendar days and dates). */
  tz: string;
  /** short_link_purge_days; SHORT_LINK_PURGE_DAYS unless the app read the setting. */
  purgeDays: number;
}

export type ExpiryKind = 'today' | 'tomorrow' | 'in_days' | 'ended' | 'revoked';

export interface ExpiryParts {
  kind: ExpiryKind;
  /** The expiry (ISO). */
  at: string;
  /** Calendar days from today to the expiry in the viewer's zone (negative once past). */
  days: number;
  /** When the link and its visits are deleted (ISO). */
  purgeAt: string;
}

type Row = Pick<ShortLinkRow, 'status' | 'expiresAt'>;

const RUNNING: Readonly<Record<number, 'today' | 'tomorrow'>> = { 0: 'today', 1: 'tomorrow' };

const dayOf = (at: Date | number, tz: string): string => localDateIn(at, tz);

const runningKind = (days: number): ExpiryKind => RUNNING[Math.max(0, days)] ?? 'in_days';

const hasEnded = (row: Row, now: Date): boolean =>
  row.status === 'expired' || Date.parse(row.expiresAt) <= now.getTime();

/** What the expiry column says, as parts (the apps write the dates in their own format). */
export function expiryParts(row: Row, clock: ExpiryClock): ExpiryParts {
  const at = row.expiresAt;
  const end = Date.parse(at);
  const days = calendarDaysBetween(dayOf(clock.now, clock.tz), dayOf(end, clock.tz));
  const purgeAt = addDaysIn(end, clock.purgeDays, clock.tz).toISOString();
  const ended: ExpiryKind = row.status === 'revoked' ? 'revoked' : 'ended';
  const kind = hasEnded(row, clock.now) || row.status === 'revoked' ? ended : runningKind(days);
  return { kind, at, days, purgeAt };
}

/** shortLinks.expiry: one line per kind, `{date}` / `{purge}` slots, inDays per count form. */
export interface ExpiryWords {
  today: string;
  tomorrow: string;
  inDays: Readonly<Record<PluralForm, string>>;
  ended: string;
  revoked: string;
}

type ExpiryLine = (p: ExpiryParts, words: ExpiryWords, date: (iso: string) => string) => string;

const ended = (key: 'ended' | 'revoked'): ExpiryLine => (p, w, date) =>
  fillSlots(w[key], { date: date(p.at), purge: date(p.purgeAt) });

const LINES: Readonly<Record<ExpiryKind, ExpiryLine>> = {
  today: (_p, w) => w.today,
  tomorrow: (_p, w) => w.tomorrow,
  in_days: (p, w) => counted(w.inDays, p.days),
  ended: ended('ended'),
  revoked: ended('revoked'),
};

export interface ExpiryTextOptions {
  words: ExpiryWords;
  /** Formats in the viewer's zone. */
  date: (iso: string) => string;
}

export function expiryText(parts: ExpiryParts, opts: ExpiryTextOptions): string {
  return LINES[parts.kind](parts, opts.words, opts.date);
}
