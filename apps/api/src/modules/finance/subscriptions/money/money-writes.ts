import { Injectable } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../../../common/audit/audit.service';
import { SubscriptionAlertsService } from '../alerts/alerts.service';
import { MoneyFollowUps } from './money-follow-ups';
import { activatesStudent } from '../student-lifecycle/student-activation';
import type { RenewalCause } from '../student-lifecycle/student-renewal';

type Done = AuditEntry & { actorId: string };

/** A payment create carries its id to the renewal flip (pending_renewal → active, docs/11 §7). */
export function causeOf(entry: Pick<AuditEntry, 'entity' | 'action' | 'entityId' | 'after'>): RenewalCause {
  const payment = entry.entity === 'payments' && entry.action === 'create' && activatesStudent(entry.after);
  return payment ? { via: 'payment', paymentId: entry.entityId } : { via: 'event' };
}

/**
 * After every subscription / payment write: the audit row (R-NFR-03); then MoneyFollowUps: a new package
 * converts the family's lead (R-LEAD-01), a new payment turns a not-subscribed or package-ended student
 * active («مشترك»), deleting that payment reverts it (owner 2026-10-12, 2026-10-15); then the student's package statuses, alerts and the
 * «بانتظار التجديد» rule are recomputed (R-SUB-01/02; journey 3: a full payment → the package active).
 */
@Injectable()
export class MoneyWrites {
  constructor(
    private readonly audit: AuditService,
    private readonly alerts: SubscriptionAlertsService,
    private readonly follow: MoneyFollowUps,
  ) {}

  async done(entry: Done, studentId: string | null): Promise<void> {
    await this.audit.record(entry);
    if (entry.entity === 'subscriptions' && entry.action === 'delete') await this.alerts.closeTasksOf(entry.entityId);
    if (studentId) await this.followUp(entry, studentId);
  }

  /**
   * A retried payment form (same clientRequestId) that finds its payment already recorded: the follow-ups
   * and the recompute run again (all idempotent), so a flip lost to a failure after the insert is not lost.
   */
  async replayed(entry: Done, studentId: string | null): Promise<void> {
    if (studentId) await this.followUp(entry, studentId);
  }

  private async followUp(entry: Done, studentId: string): Promise<void> {
    await this.follow.after(entry, { studentId, actorId: entry.actorId });
    await this.alerts.evaluateStudents([studentId], { actorId: entry.actorId, cause: causeOf(entry) });
  }
}
