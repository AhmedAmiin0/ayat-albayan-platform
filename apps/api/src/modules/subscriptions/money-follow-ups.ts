import { Injectable } from '@nestjs/common';
import { LeadConversion } from './lead-conversion';
import { activatesStudent, StudentActivation } from './student-activation';
import { StudentDeactivation, type DeletedPayment } from './student-deactivation';

type Write = { entity: string; entityId?: string; action: string; before?: unknown; after?: unknown };

const isDeletedPayment = (row: unknown): row is DeletedPayment =>
  typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string' && activatesStudent(row);

/**
 * What a money write changes outside money (MoneyWrites, after the audit, before the recompute): a new
 * package converts the family's lead (R-LEAD-01); a new payment of a trial student makes it «مشترك» with
 * the payment's id (owner 2026-10-12); deleting that payment reverts it (StudentDeactivation, with the full
 * `before` row). Updates and refunds change nothing. Idempotent: a retried form runs it again safely.
 */
@Injectable()
export class MoneyFollowUps {
  constructor(
    private readonly leads: LeadConversion,
    private readonly students: StudentActivation,
    private readonly revert: StudentDeactivation,
  ) {}

  async after(write: Write, ids: { studentId: string; actorId: string }): Promise<void> {
    if (write.entity === 'payments' && write.action === 'delete' && isDeletedPayment(write.before))
      await this.revert.afterDelete(write.before, ids);
    if (write.action !== 'create') return;
    if (write.entity === 'subscriptions') await this.leads.afterPackage(ids.studentId, ids.actorId);
    if (write.entity === 'payments' && write.entityId && activatesStudent(write.after))
      await this.students.afterPayment(ids.studentId, ids.actorId, write.entityId);
  }
}
