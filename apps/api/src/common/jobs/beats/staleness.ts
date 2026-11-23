import type { JobBeat } from '@ab/shared';

/** A job is stale when its last success is older than this many of its intervals… */
export const STALE_AFTER_INTERVALS = 3;
/** …and never sooner: one slow pass of a fast poller (10 s; 1 s in e2e) is not an alert. */
export const MIN_STALE_MS = 10 * 60_000;

const windowOf = (beat: JobBeat): number =>
  Math.max(STALE_AFTER_INTERVALS * beat.everyMs, MIN_STALE_MS);

/** Last success (or, before the first one, the first due run) older than the job's window. */
export const isStale = (beat: JobBeat, now: number): boolean =>
  now - (beat.lastOkAt ?? beat.since) > windowOf(beat);

export const staleNames = (beats: readonly JobBeat[], now: number): string[] =>
  beats.filter((b) => isStale(b, now)).map((b) => b.name);
