import { Injectable } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../common/audit/audit.service';
import { SubscriptionAlertsService } from './alerts.service';
import { MoneyFollowUps } from './money-follow-ups';

/**
 * After every subscription / payment write: the audit row (R-NFR-03), then the student's package
 * statuses and alerts are recomputed (R-SUB-01/02; journey 3: a full payment → the package active).
 * Then MoneyFollowUps: a new package converts the family's lead (R-LEAD-01: subscribed after a
 * trial), a new payment turns a trial student active («مشترك», owner 2026-10-12).
 */
@Injectable()
export class MoneyWrites {
  constructor(
    private readonly audit: AuditService,
    private readonly alerts: SubscriptionAlertsService,
    private readonly follow: MoneyFollowUps,
  ) {}

  async done(entry: AuditEntry & { actorId: string }, studentId: string | null): Promise<void> {
    await this.audit.record(entry);
    if (entry.entity === 'subscriptions' && entry.action === 'delete') await this.alerts.closeTasksOf(entry.entityId);
    if (!studentId) return;
    await this.alerts.evaluateStudents([studentId], { actorId: entry.actorId });
    await this.follow.after(entry, { studentId, actorId: entry.actorId });
  }
}
