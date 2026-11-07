import { storageProviderOf, storedPath } from '@ab/shared';
import type { PathColumn } from './columns';
import type { MoveDb, PathRow } from './move-db';
import { placeInMinio, type Placed, type Stores } from './place';

// One row (docs/45 §6): its object into MinIO and verified, then its path rewritten to
// «minio:<key>» only if the row still holds the path it was read with.

export type RowOutcome =
  | 'rewritten'
  | 'skipped'
  | 'missing'
  | 'mismatch'
  | 'too_large'
  | 'changed'
  | 'failed';

export interface RowStep {
  outcome: RowOutcome;
  /** This run put the object into MinIO (it was not there before). */
  copied: boolean;
}

interface RowCtx {
  db: MoveDb;
  stores: Stores;
  column: PathColumn;
}

/** Placed in MinIO and verified → rewrite; anything else is the row's outcome as it stands. */
const NEXT: Record<Placed, RowOutcome | 'rewrite'> = {
  copied: 'rewrite',
  present: 'rewrite',
  missing: 'missing',
  mismatch: 'mismatch',
  too_large: 'too_large',
};

const step = (outcome: RowOutcome, copied = false): RowStep => ({ outcome, copied });

async function rewriteVerified(ctx: RowCtx, row: PathRow, placed: Placed): Promise<RowStep> {
  const copied = placed === 'copied';
  const next = NEXT[placed];
  if (next !== 'rewrite') return step(next, copied);
  const to = storedPath({ provider: 'minio', key: row.path });
  const done = await ctx.db.rewrite({ column: ctx.column, row, to });
  // Lost the compare-and-set: the row changed meanwhile (a re-render, a delete, an edit).
  return step(done ? 'rewritten' : 'changed', copied);
}

async function moveOne(ctx: RowCtx, row: PathRow): Promise<RowStep> {
  const o = { bucket: ctx.column.bucket, key: row.path };
  return rewriteVerified(ctx, row, await placeInMinio(ctx.stores, o));
}

const isMarked = (row: PathRow): boolean => storageProviderOf(row.path) === 'minio';

/** Never throws: a store or database error is «failed» and the run goes on with the next row. */
export function moveRow(ctx: RowCtx, row: PathRow): Promise<RowStep> {
  if (isMarked(row)) return Promise.resolve(step('skipped'));
  return moveOne(ctx, row).catch(() => step('failed'));
}
