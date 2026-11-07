import type { PathColumn } from './columns';
import { FIRST_ID, type MoveDb, type PathRow } from './move-db';
import type { Stores } from './place';
import { moveRow, type RowStep } from './row-move';
import { add, COUNTS, emptyTally, totals, type ColumnTally, type Totals } from './tally';

// --apply (docs/45 §6): column after column, batches ordered by id, one row at a time (the VPS
// also runs the live CRM), a pause between batches, one audit_log row per batch.

export interface MoveJob {
  db: MoveDb;
  stores: Stores;
  columns: readonly PathColumn[];
  /** Rows to handle in this run, over all columns. */
  limit: number;
  batch: number;
  /** Resume after this row id (one --table only). */
  after?: string;
  pauseMs: number;
  sleep?: (ms: number) => Promise<void>;
  /** Before every batch: throws to stop (STORAGE_DRIVER switched away from minio meanwhile). */
  guard?: () => Promise<void>;
}

interface MoveSummary {
  mode: 'apply';
  columns: ColumnTally[];
  totals: Totals;
  /** Why the run stopped early; the cursors above say where (resume with --after). */
  error?: string;
}

const nap = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface Budget {
  left: number;
}

async function moveBatch(job: MoveJob, at: { column: PathColumn; rows: PathRow[] }) {
  const tally = emptyTally(at.column, '');
  const rewritten: PathRow[] = [];
  for (const row of at.rows) {
    const step: RowStep = await moveRow({ db: job.db, stores: job.stores, column: at.column }, row);
    add(tally, { id: row.id, step });
    rewritten.push(...(step.outcome === 'rewritten' ? [row] : []));
  }
  const counts = { ...totals([tally]) };
  const firstId = at.rows[0]?.id ?? FIRST_ID;
  await job.db.audit({ column: at.column, firstId, rewritten, counts });
  return tally;
}

function merge(into: ColumnTally, batch: ColumnTally): void {
  for (const k of COUNTS) into[k] += batch[k];
  into.cursor = batch.cursor;
}

const noGuard = (): Promise<void> => Promise.resolve();

/** Fills `tally` as it goes, so a run that stops on an error still reports what it did. */
interface ColumnRun {
  column: PathColumn;
  tally: ColumnTally;
  budget: Budget;
}

async function moveColumn(job: MoveJob, at: ColumnRun) {
  const { column, tally, budget } = at;
  tally.skipped = await job.db.count({ column, marked: true });
  for (;;) {
    const limit = Math.min(job.batch, budget.left);
    await (job.guard ?? noGuard)();
    const rows = limit > 0 ? await job.db.page({ column, after: tally.cursor, limit }) : [];
    if (!rows.length) return;
    merge(tally, await moveBatch(job, { column, rows }));
    budget.left -= rows.length;
    await (job.sleep ?? nap)(job.pauseMs);
  }
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function moveColumns(job: MoveJob): Promise<MoveSummary> {
  const budget = { left: job.limit };
  const columns: ColumnTally[] = [];
  const run = async (): Promise<void> => {
    for (const column of job.columns) {
      const tally = emptyTally(column, job.after ?? FIRST_ID);
      columns.push(tally);
      await moveColumn(job, { column, tally, budget });
    }
  };
  const error = await run().then(
    () => undefined,
    (e: unknown) => message(e),
  );
  const summary: MoveSummary = { mode: 'apply', columns, totals: totals(columns) };
  return error === undefined ? summary : { ...summary, error };
}
