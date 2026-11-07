import type { ArchiveKind, ArchiveRow } from './archive.types';

const DAY_MS = 86_400_000;

/** The UTC day, YYYY-MM-DD. */
export const dayLabel = (d: Date): string => d.toISOString().slice(0, 10);

/** The ISO 8601 week of the UTC day, YYYY-Www (the week's Thursday decides the year). */
export function weekLabel(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - isoWeekday(t));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday 1 … Sunday 7 (UTC). */
export const isoWeekday = (d: Date): number => ((d.getUTCDay() + 6) % 7) + 1;

/** `incr-2026-11-07.tar.zst`, `full-2026-W45.tar.zst`; part 2 on: `….p2.tar.zst`. */
export function archiveName(input: { kind: ArchiveKind; label: string; part: number }): string {
  const part = input.part > 1 ? `.p${input.part}` : '';
  return `${input.kind}-${input.label}${part}.tar.zst`;
}

/** ms from `now` to the next `hour`:00 UTC. */
export function msUntilUtcHour(now: Date, hour: number): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour);
  const next = today > now.getTime() ? today : today + DAY_MS;
  return next - now.getTime();
}

/** The marker Drive keeps on each archive: the restore reads the chain from these alone. */
export const archiveProps = (row: Pick<ArchiveRow, 'kind' | 'label' | 'part'>, day: string) => ({
  ab_source: 'platform',
  ab_backup: 'minio',
  kind: row.kind,
  label: row.label,
  part: String(row.part),
  day,
});
