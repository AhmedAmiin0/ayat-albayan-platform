import { z } from 'zod';

/**
 * GET /threads/sync cursor (docs/43 §5): the last row's `updated_at` (Postgres' own microsecond
 * text, never rounded through Date) and its id, joined by «~». Keyset on (updated_at, id): rows
 * sharing one timestamp (a bulk update) still page without a gap or a loop.
 */
export const SYNC_CURSOR_SEP = '~';
/** The id that sorts before every uuid: a rewound cursor re-reads every row at its instant. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';
/** A write may commit after rows stamped later: the client re-asks from cursor − 10 s. */
export const SYNC_OVERLAP_MS = 10_000;

const cursorParts = z.tuple([z.iso.datetime({ offset: true }), z.uuid()]);

export interface SyncCursor {
  at: string;
  id: string;
}

export const syncCursorSchema = z
  .string()
  .max(80)
  .transform((s) => s.split(SYNC_CURSOR_SEP))
  .pipe(cursorParts)
  .transform(([at, id]): SyncCursor => ({ at, id }));

export const encodeSyncCursor = (c: SyncCursor): string => `${c.at}${SYNC_CURSOR_SEP}${c.id}`;

/** A caught-up client re-asks from SYNC_OVERLAP_MS earlier, every id at that instant. */
export function rewindSyncCursor(cursor: string): string {
  const { at } = syncCursorSchema.parse(cursor);
  const back = new Date(Date.parse(at) - SYNC_OVERLAP_MS).toISOString();
  return encodeSyncCursor({ at: back, id: NIL_UUID });
}
