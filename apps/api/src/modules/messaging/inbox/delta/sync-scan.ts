import { compareCursors, type SyncCursor } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp';
import type { TombstoneRow } from './sync.repo';

/** One page of the sync: live rows and deleted ids, one keyset order. */
export interface SyncScan {
  rows: ThreadMessageRow[];
  deleted: string[];
  /** The last scanned item's stamp; null when nothing was scanned. */
  last: SyncCursor | null;
  /** More than `limit` items were after the cursor. */
  more: boolean;
}

interface Item {
  stamp: SyncCursor;
  row?: ThreadMessageRow;
}

const live = (r: ThreadMessageRow): Item => ({ stamp: { at: r.updated_at, id: r.id }, row: r });
const dead = (t: TombstoneRow): Item => ({ stamp: { at: t.deleted_at, id: t.id } });

/**
 * Both reads are `limit + 1` after the same cursor, so the first `limit` of their merge in (stamp,
 * id) order is exactly the next page of the union, and anything past it means more.
 */
export function syncScan(
  found: { rows: readonly ThreadMessageRow[]; tombstones: readonly TombstoneRow[] },
  limit: number,
): SyncScan {
  const all = [...found.rows.map(live), ...found.tombstones.map(dead)];
  const page = all.sort((a, b) => compareCursors(a.stamp, b.stamp)).slice(0, limit);
  return {
    rows: page.flatMap((i) => (i.row ? [i.row] : [])),
    deleted: page.flatMap((i) => (i.row ? [] : [i.stamp.id])),
    last: page.at(-1)?.stamp ?? null,
    more: all.length > limit,
  };
}
