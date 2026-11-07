import type { SupabaseClient } from '@supabase/supabase-js';
import { MINIO_MARK } from '@ab/shared';
import { z } from 'zod';
import type { PathColumn } from './columns';
import type { BatchAudit, MoveDb, PathRow } from './move-db';

// The move's database side through PostgREST (service role, inside the worker container). The
// table and column come from columns.ts only, never from the command line as such.

const MARKED = `${MINIO_MARK}%`;

const Ids = z.array(z.object({ id: z.guid() }));

const Rows = z.array(z.object({ id: z.guid(), path: z.string() }));

const fail = (what: string, error: { message: string }): Error =>
  new Error(`storage-move ${what} failed: ${error.message}`);

/** A client without the generated row types: the table name is a value here (columns.ts). */
type LooseDb = SupabaseClient;

export class MoveRepo implements MoveDb {
  constructor(private readonly db: LooseDb) {}

  async page(input: { column: PathColumn; after: string; limit: number }): Promise<PathRow[]> {
    const { table, column } = input.column;
    const { data, error } = await this.db
      .from(table)
      .select(`id, path:${column}`)
      .not(column, 'is', null)
      .not(column, 'like', MARKED)
      .gt('id', input.after)
      .order('id')
      .limit(input.limit);
    if (error) throw fail('page', error);
    return Rows.parse(data);
  }

  async count(input: { column: PathColumn; marked: boolean }): Promise<number> {
    const { table, column } = input.column;
    const base = this.db.from(table).select('id', { count: 'exact', head: true });
    const set = base.not(column, 'is', null);
    const q = input.marked ? set.like(column, MARKED) : set.not(column, 'like', MARKED);
    const { count, error } = await q;
    if (error) throw fail('count', error);
    return count ?? 0;
  }

  /** UPDATE … SET col = to WHERE id = $id AND col = $from: a row changed meanwhile is untouched. */
  async rewrite(input: { column: PathColumn; row: PathRow; to: string }): Promise<boolean> {
    const { table, column } = input.column;
    const { data, error } = await this.db
      .from(table)
      .update({ [column]: input.to })
      .eq('id', input.row.id)
      .eq(column, input.row.path)
      .select('id');
    if (error) throw fail('rewrite', error);
    return Ids.parse(data).length === 1;
  }

  async audit(entry: BatchAudit): Promise<void> {
    const { table, column, bucket } = entry.column;
    const { error } = await this.db.from('audit_log').insert({
      actor_id: null,
      entity: 'storage_move',
      entity_id: entry.firstId,
      action: 'storage_move_batch',
      before: { table, column, bucket, rows: entry.rewritten },
      after: { counts: entry.counts },
    });
    if (error) throw fail('audit', error);
  }
}
