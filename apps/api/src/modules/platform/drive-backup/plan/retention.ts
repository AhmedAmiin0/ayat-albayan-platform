import type { ArchiveRow } from './archive.types';

/** Fulls kept on Drive (owner 2026-11-07): the last 4, and the incrementals after the oldest. */
const KEEP_FULLS = 4;

const sealedLabels = (live: readonly ArchiveRow[]): string[] =>
  [...new Set(live.filter((r) => r.kind === 'full' && r.sealed).map((r) => r.label))].sort();

/**
 * The archives to delete from Drive: everything that started before the oldest kept full's first
 * part. Nothing while `keep` or fewer fulls are sealed.
 */
export function toTrash(rows: readonly ArchiveRow[], keep = KEEP_FULLS): ArchiveRow[] {
  const live = rows.filter((r) => r.status === 'done');
  const kept = sealedLabels(live).slice(-keep);
  const oldest = kept.length < keep ? null : kept[0];
  const starts = live
    .filter((r) => r.kind === 'full' && r.label === oldest)
    .map((r) => r.started_at);
  const cutoff = starts.sort()[0];
  return cutoff === undefined ? [] : live.filter((r) => r.started_at < cutoff);
}

/**
 * Room for an open full the budget cannot finish (docs/45 §5.1): the oldest sealed full and the
 * incrementals before the next one go early, as long as one sealed full and its chain stay. Drive
 * never has to hold KEEP_FULLS + 1 fulls at once.
 */
export function retireEarly(rows: readonly ArchiveRow[]): ArchiveRow[] {
  const sealed = sealedLabels(rows.filter((r) => r.status === 'done')).length;
  return sealed < 2 ? [] : toTrash(rows, sealed - 1);
}

/**
 * Failed parts: their objects are not counted as backed up, so a file of theirs only uses quota.
 * Each is removed every run (by its stored id, or found by its row marker: seal.ts), then trashed.
 */
export const orphans = (rows: readonly ArchiveRow[]): ArchiveRow[] =>
  rows.filter((r) => r.status === 'failed');
