import type { PartPlan } from './archive.types';

const WEEK_MS = 7 * 86_400_000;

/** The UTC day, YYYY-MM-DD. */
export const dayLabel = (d: Date): string => d.toISOString().slice(0, 10);

/** `add-2026-11-07.p1.tar.zst`: the night's day and the part number. */
export const archiveName = (p: PartPlan): string => `add-${p.label}.p${p.part}.tar.zst`;

/** ms from `now` to the next `weekday` (0 = Sunday) at `hour`:00 UTC; a full week when on it. */
export function msUntilUtcWeekly(now: Date, at: { weekday: number; hour: number }): number {
  const daysAhead = (at.weekday - now.getUTCDay() + 7) % 7;
  const day = now.getUTCDate() + daysAhead;
  const target = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, at.hour);
  const ms = target - now.getTime();
  return ms > 0 ? ms : ms + WEEK_MS;
}

/** The marker Drive keeps on each archive: the restore orders the archives from these alone. */
export const archiveProps = (p: PartPlan) => ({
  ab_source: 'platform',
  ab_backup: 'minio',
  label: p.label,
  part: String(p.part),
});
