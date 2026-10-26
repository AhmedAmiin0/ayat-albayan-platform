import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import type { CommissionsQuery } from '../assistant-pay.dto';
import { COMMISSION_SELECT, type CommissionRow } from './commissions.mapper';

/** The admin's ledger cap: the newest rows first; narrow by assistant, status or date for more. */
const LEDGER_LIMIT = 500;

/** assistant_commissions reads for the admin (service role; the controllers guard). */
@Injectable()
export class CommissionsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: CommissionsQuery): Promise<CommissionRow[]> {
    let q = this.db.from('assistant_commissions').select(COMMISSION_SELECT);
    if (f.assistantId) q = q.eq('assistant_id', f.assistantId);
    if (f.status) q = q.eq('status', f.status);
    if (f.from) q = q.gte('earned_at', f.from);
    if (f.to) q = q.lt('earned_at', f.to);
    const { data, error } = await q
      .order('earned_at', { ascending: false })
      .order('id')
      .limit(LEDGER_LIMIT)
      .overrideTypes<CommissionRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
