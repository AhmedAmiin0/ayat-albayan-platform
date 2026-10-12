import { Injectable } from '@nestjs/common';
import { LeadConversion } from './lead-conversion';
import { activatesStudent, StudentActivation } from './student-activation';

type Write = { entity: string; action: string; after?: unknown };

/**
 * What a money write changes outside money (MoneyWrites, after the audit and the recompute): a new package
 * converts the family's lead (R-LEAD-01); a new payment of a trial student makes it «مشترك» (owner
 * 2026-10-12). Updates and deletes change neither.
 */
@Injectable()
export class MoneyFollowUps {
  constructor(
    private readonly leads: LeadConversion,
    private readonly students: StudentActivation,
  ) {}

  async after(write: Write, ids: { studentId: string; actorId: string }): Promise<void> {
    if (write.action !== 'create') return;
    if (write.entity === 'subscriptions') await this.leads.afterPackage(ids.studentId, ids.actorId);
    if (write.entity === 'payments' && activatesStudent(write.after)) await this.students.afterPayment(ids.studentId, ids.actorId);
  }
}
