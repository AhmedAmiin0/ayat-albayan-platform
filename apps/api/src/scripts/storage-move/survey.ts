import { FIRST_ID, type MoveDb } from './move-db';
import type { PathColumn } from './columns';
import type { ObjectStore } from '@/common/storage/store/object-store';

// The dry run (the default, docs/45 §6): counts per column and a few rows checked in both stores.
// Writes nothing: no object, no row, no audit.

interface SurveyJob {
  db: MoveDb;
  from: ObjectStore;
  to: ObjectStore;
  columns: readonly PathColumn[];
  /** Rows checked per column. */
  sample: number;
}

interface ColumnSurvey {
  table: string;
  column: string;
  bucket: string;
  /** Rows already «minio:» (skipped by --apply). */
  inMinio: number;
  /** Rows with an unmarked path: what --apply would move. */
  toMove: number;
  sample: { id: string; inSupabase: boolean; inMinioAlready: boolean }[];
}

async function surveyColumn(job: SurveyJob, column: PathColumn): Promise<ColumnSurvey> {
  const [inMinio, toMove, rows] = await Promise.all([
    job.db.count({ column, marked: true }),
    job.db.count({ column, marked: false }),
    job.db.page({ column, after: FIRST_ID, limit: job.sample }),
  ]);
  const sample = [];
  for (const row of rows) {
    const o = { bucket: column.bucket, key: row.path };
    const [src, dst] = await Promise.all([job.from.info(o), job.to.info(o)]);
    sample.push({ id: row.id, inSupabase: src !== null, inMinioAlready: dst !== null });
  }
  const { table, column: name, bucket } = column;
  return { table, column: name, bucket, inMinio, toMove, sample };
}

export async function surveyColumns(job: SurveyJob) {
  const columns: ColumnSurvey[] = [];
  for (const column of job.columns) columns.push(await surveyColumn(job, column));
  return { mode: 'dry-run' as const, columns };
}
