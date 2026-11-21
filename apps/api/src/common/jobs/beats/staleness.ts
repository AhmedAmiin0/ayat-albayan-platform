import type { JobBeat } from '@ab/shared';

/** A job is stale when its last success is older than this many of its intervals. */
export const STALE_AFTER_INTERVALS = 3;

/** Last success (or, before the first one, the first due run) older than N × the interval. */
export const isStale = (beat: JobBeat, now: number): boolean =>
  now - (beat.lastOkAt ?? beat.since) > STALE_AFTER_INTERVALS * beat.everyMs;

export const staleNames = (beats: readonly JobBeat[], now: number): string[] =>
  beats.filter((b) => isStale(b, now)).map((b) => b.name);
