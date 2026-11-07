import type { PathColumn } from './columns';

// The database side of the move (move-db.supabase.ts on the server, move.fakes.ts in tests).

export interface PathRow {
  id: string;
  path: string;
}

/** One audit_log row per applied batch: enough to set every rewritten row back (docs/45 §6). */
export interface BatchAudit {
  column: PathColumn;
  /** The first row id of the batch (audit_log.entity_id). */
  firstId: string;
  /** The rows rewritten in this batch, with the unmarked path each one had. */
  rewritten: PathRow[];
  counts: Record<string, number>;
}

export interface MoveDb {
  /** Unmarked, non-null paths with id > after, by id: the resumable cursor. */
  page(input: { column: PathColumn; after: string; limit: number }): Promise<PathRow[]>;
  /** Rows whose path is set: already «minio:» (marked) or not. */
  count(input: { column: PathColumn; marked: boolean }): Promise<number>;
  /** Compare-and-set: true only when the row still held `row.path` and now holds `to`. */
  rewrite(input: { column: PathColumn; row: PathRow; to: string }): Promise<boolean>;
  audit(entry: BatchAudit): Promise<void>;
}

/** Before the first uuid: the cursor of a fresh run. */
export const FIRST_ID = '00000000-0000-0000-0000-000000000000';
