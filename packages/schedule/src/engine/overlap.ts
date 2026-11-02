import type { Occurrence } from './occurrences.js';

/**
 * The one overlap test of the scheduling engine (docs/32 k5c): two half-open spans clash when each
 * starts before the other ends, so touching end-to-start is not a clash.
 */
export const spansOverlap = (a: Occurrence, b: Occurrence): boolean =>
  a.starts_at < b.ends_at && b.starts_at < a.ends_at;
