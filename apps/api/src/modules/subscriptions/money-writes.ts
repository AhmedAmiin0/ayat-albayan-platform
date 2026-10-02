import { Injectable } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../common/audit/audit.service';
import { SubscriptionAlertsService } from './alerts.service';
import { LeadConversion } from './lead-conversion';

/**
 * After every subscription / payment write: the audit row (R-NFR-03), then the student's package
 * statuses and alerts are recomputed (R-SUB-01/02; journey 3: a full payment → active). A new
 * package also converts the family's lead (R-LEAD-01: subscribed after a trial).
 */
@Injectable()
export class MoneyWrites {
  constructor(
    private readonly audit: AuditService,
    private readonly alerts: SubscriptionAlertsService,
    private readonly leads: LeadConversion,
  ) {}

  async done(entry: AuditEntry & { actorId: string }, studentId: string | null): Promise<void> {
    await this.audit.record(entry);
    if (entry.entity === 'subscriptions' && entry.action === 'delete') await this.alerts.closeTasksOf(entry.entityId);
    if (studentId) await this.alerts.evaluateStudents([studentId], { actorId: entry.actorId });
    if (studentId && entry.entity === 'subscriptions' && entry.action === 'create') await this.leads.afterPackage(studentId, entry.actorId);
  }
}
