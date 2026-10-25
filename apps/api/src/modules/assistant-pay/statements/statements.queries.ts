import type { Enums } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import { STATEMENT_SELECT, type StatementRow } from './statements.mapper';

export interface StatementFilter {
  assistantId?: string;
  /** YYYY-MM-01 */
  month?: string;
  status?: Enums<'payout_status'>;
  /** A draft is still the admin's to change: an assistant never sees one. */
  hideDrafts?: boolean;
}

/** Reads of assistant_statements with their lines (service role; the controllers scope every call, rule 9). */
@Injectable()
export class StatementsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Newest month first, then by assistant name. */
  async list(f: StatementFilter): Promise<StatementRow[]> {
    let q = this.db.from('assistant_statements').select(STATEMENT_SELECT);
    if (f.assistantId) q = q.eq('assistant_id', f.assistantId);
    if (f.month) q = q.eq('month', f.month);
    if (f.status) q = q.eq('status', f.status);
    if (f.hideDrafts) q = q.neq('status', 'draft');
    const { data, error } = await q.order('month', { ascending: false }).overrideTypes<StatementRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data.sort((a, b) => b.month.localeCompare(a.month) || (a.assistant?.full_name ?? '').localeCompare(b.assistant?.full_name ?? '', 'ar'));
  }

  async get(id: string): Promise<StatementRow | null> {
    const { data, error } = await this.db
      .from('assistant_statements')
      .select(STATEMENT_SELECT)
      .eq('id', id)
      .maybeSingle<StatementRow>();
    if (error) throw dbError(error);
    return data;
  }
}
