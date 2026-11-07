import type { PartPlan } from './archive.types';

const DAY_MS = 86_400_000;

/** The UTC day, YYYY-MM-DD. */
export const dayLabel = (d: Date): string => d.toISOString().slice(0, 10);

/** `add-2026-11-07.p1.tar.zst`: the night's day and the part number. */
export const archiveName = (p: PartPlan): string => `add-${p.label}.p${p.part}.tar.zst`;

/** ms from `now` to the next `hour`:00 UTC. */
export function msUntilUtcHour(now: Date, hour: number): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour);
  const next = today > now.getTime() ? today : today + DAY_MS;
  return next - now.getTime();
}

/** The marker Drive keeps on each archive: the restore orders the archives from these alone. */
export const archiveProps = (p: PartPlan) => ({
  ab_source: 'platform',
  ab_backup: 'minio',
  label: p.label,
  part: String(p.part),
});
