import type { ArchiveRow } from './archive.types';

/** Fulls kept on Drive (owner 2026-11-07): the last 4, and the incrementals after the oldest. */
const KEEP_FULLS = 4;

/**
 * The archives to move to Drive's trash once a newer full is sealed: everything that started
 * before the oldest kept full's first part. Nothing while fewer than KEEP_FULLS fulls are sealed.
 */
export function toTrash(rows: readonly ArchiveRow[], keep = KEEP_FULLS): ArchiveRow[] {
  const live = rows.filter((r) => r.status === 'done');
  const sealed = live.filter((r) => r.kind === 'full' && r.sealed).map((r) => r.label);
  const kept = [...new Set(sealed)].sort().slice(-keep);
  const oldest = kept.length < keep ? null : kept[0];
  const starts = live
    .filter((r) => r.kind === 'full' && r.label === oldest)
    .map((r) => r.started_at);
  const cutoff = starts.sort()[0];
  return cutoff === undefined ? [] : live.filter((r) => r.started_at < cutoff);
}
