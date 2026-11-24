import { Injectable } from '@nestjs/common';
import { CommissionBell } from './commission-bell';
import { LeadConversion } from '@/modules/finance/subscriptions/student-lifecycle/lead-conversion';
import { activatesStudent, StudentActivation } from '@/modules/finance/subscriptions/student-lifecycle/student-activation';
import { StudentDeactivation, type DeletedPayment } from '@/modules/finance/subscriptions/student-lifecycle/student-deactivation';

type Write = { entity: string; entityId?: string; action: string; before?: unknown; after?: unknown };

const isDeletedPayment = (row: unknown): row is DeletedPayment =>
  typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string' && activatesStudent(row);

/** The deleted payment's revert and the commission bell (max-params). */
@Injectable()
export class FollowUpEnv {
  constructor(
    readonly revert: StudentDeactivation,
    readonly commissions: CommissionBell,
  ) {}
}

/** New package converts the lead (R-LEAD-01); a payment activates; idempotent on retry. */
@Injectable()
export class MoneyFollowUps {
  constructor(
    private readonly leads: LeadConversion,
    private readonly students: StudentActivation,
    private readonly env: FollowUpEnv,
  ) {}

  async after(write: Write, ids: { studentId: string; actorId: string }): Promise<void> {
    if (write.entity === 'payments' && write.action === 'delete' && isDeletedPayment(write.before))
      await this.env.revert.afterDelete(write.before, ids);
    if (write.action === 'create') await this.created(write, ids);
    // A payment created, edited or deleted, a price changed (admin, sales or Stripe): the triggers may have earned one.
    await this.env.commissions.notify();
  }

  private async created(write: Write, ids: { studentId: string; actorId: string }): Promise<void> {
    if (write.entity === 'subscriptions') await this.leads.afterPackage(ids.studentId, ids.actorId);
    if (write.entity === 'payments' && write.entityId && activatesStudent(write.after))
      await this.students.afterPayment(ids.studentId, ids.actorId, write.entityId);
  }
}
