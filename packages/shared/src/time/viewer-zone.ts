import { RIYADH_TZ, type ClockOptions } from '../core/format/index.js';
import { clockOf, engineTimeZone } from './format.js';
import { isTimeZone } from '@ab/core';

// Whose clock a screen reads in (owner 2026-10-30, docs/34): «Store all in utc server time and
// format it according to the device region or user region». DB instants stay UTC (rule 6).

/** The academy's zone: only the last fallback of a display, and academy-wide day rules. */
export const ACADEMY_TZ = RIYADH_TZ;

/** A real IANA zone id (null / '' / unknown → false). */
const isZone = (tz: string | null | undefined): tz is string => !!tz && isTimeZone(tz);

/** The device's (browser's, phone's) zone, or null when the engine does not know it. */
export function deviceTimeZone(): string | null {
  try {
    const tz = engineTimeZone();
    return isZone(tz) ? tz : null;
  } catch {
    return null;
  }
}

export interface ViewerZoneInput {
  /** The signed-in person's own zone (GET /auth/me `tz`), null when not set. */
  person?: string | null | undefined;
  /** deviceTimeZone(). */
  device?: string | null | undefined;
}

/** The viewer's zone: their own tz → the device's → the academy's (docs/34 §2). */
export function resolveViewerTz(input: ViewerZoneInput): string {
  if (isZone(input.person)) return input.person;
  if (isZone(input.device)) return input.device;
  return ACADEMY_TZ;
}

/** Two zones read the same wall clock at `at` (Cairo in summer = Riyadh; in winter it doesn't). */
export function sameClockAt(at: Date, zones: { a: string; b: string }): boolean {
  if (zones.a === zones.b) return true;
  const opts = { cycle: '24', locale: 'en' } as const;
  return clockOf(at, { ...opts, tz: zones.a }) === clockOf(at, { ...opts, tz: zones.b });
}

/**
 * The other person's clock for a secondary label («٦:٠٠ م بتوقيت العائلة»), or null when their
 * zone reads the same time as the viewer's at that instant (no label needed).
 */
export function otherZoneClock(
  at: Date,
  other: string | null | undefined,
  opts: ClockOptions,
): string | null {
  if (!isZone(other) || sameClockAt(at, { a: other, b: opts.tz })) return null;
  return clockOf(at, { ...opts, tz: other });
}
