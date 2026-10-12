import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

/** A recorded payment (not a refund) of more than zero: what turns a trial student into «مشترك». */
export function activatesStudent(row: unknown): boolean {
  if (typeof row !== 'object' || row === null) return false;
  const kind = 'kind' in row ? row.kind : undefined;
  const amount = 'amount' in row ? Number(row.amount) : 0;
  return kind === 'payment' && amount > 0;
}

/**
 * Trial → active on the first payment (owner 2026-10-12, docs/11 §7): whoever records it (admin or the
 * salesperson), a student still in `trial` becomes `active` («مشترك») in the same API flow. Compare-and-set
 * on status = 'trial', so it is idempotent and a paused or churned student is never touched; audited as a
 * status_change by the recorder. Deleting the payment does not revert it: the admin edits the status by hand.
 */
@Injectable()
export class StudentActivation {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async afterPayment(studentId: string, actorId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('students')
      .update({ status: 'active' })
      .eq('id', studentId)
      .eq('status', 'trial')
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return false;
    const entry = { actorId, entity: 'students', entityId: studentId, action: 'status_change' };
    await this.audit.record({ ...entry, before: { status: 'trial' }, after: { status: 'active', via: 'payment' } });
    return true;
  }
}
