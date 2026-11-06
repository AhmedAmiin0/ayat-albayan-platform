import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { AuditService, type AuditEntry } from '../../../../common/audit/audit.service';
import { SubscriptionAlertsService } from '../alerts/alerts.service';
import { MoneyFollowUps } from './money-follow-ups';
import { activatesStudent } from '../student-lifecycle/student-activation';
import type { RenewalCause } from '../student-lifecycle/student-renewal';

type Done = AuditEntry & { actorId: string };

const GONE: ReadonlySet<string> = new Set(['delete', 'cancel']);

/** The package an incoming payment row was recorded on. */
const paidRow = z.object({ subscription_id: z.uuid() });

/** The package a write paid (a positive incoming payment created), else null. */
function paidPackage(entry: Pick<AuditEntry, 'entity' | 'action' | 'after'>): string | null {
  const created = entry.entity === 'payments' && entry.action === 'create';
  const row = paidRow.safeParse(entry.after);
  return created && activatesStudent(entry.after) && row.success ? row.data.subscription_id : null;
}

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
 * Last, a payment tells PackageEvents (its package's weekly days picked before the payment are
 * booked once it is active, owner 2026-11-06).
 */
@Injectable()
export class MoneyWrites {
  constructor(
    private readonly audit: AuditService,
    private readonly alerts: SubscriptionAlertsService,
    private readonly follow: MoneyFollowUps,
    private readonly packages: PackageEvents,
  ) {}

  async done(entry: Done, studentId: string | null): Promise<void> {
    await this.audit.record(entry);
    await this.recorded(entry, studentId);
  }

  /** As done, for a write whose RPC wrote its audit row in its own transaction (stop_course). */
  async recorded(entry: Done, studentId: string | null): Promise<void> {
    // A deleted or cancelled package: its open tasks have nothing left to point at.
    if (entry.entity === 'subscriptions' && GONE.has(entry.action)) await this.alerts.closeTasksOf(entry.entityId);
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
    const paid = paidPackage(entry);
    if (paid) await this.packages.paid(paid);
  }
}
