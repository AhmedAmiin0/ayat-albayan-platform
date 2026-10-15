import { paymentMove } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StudentStatusQueries } from './student-status.queries';

/** A recorded payment (not a refund) of more than zero: what turns a trial student into «مشترك». */
export function activatesStudent(row: unknown): boolean {
  if (typeof row !== 'object' || row === null) return false;
  const kind = 'kind' in row ? row.kind : undefined;
  const amount = 'amount' in row ? Number(row.amount) : 0;
  return kind === 'payment' && amount > 0;
}

/**
 * Not subscribed / package ended → active on a positive payment (owner 2026-10-12, 2026-10-15, docs/11 §7):
 * whoever records it (admin or the salesperson), a student in new / trial / pending_subscription /
 * pending_renewal / expired becomes `active` («مشترك») in the same API flow (paymentMove). Compare-and-set
 * on the status read, so it is idempotent (a retried form re-runs it safely) and a paused or churned
 * student is never touched; audited as a status_change by the recorder with the payment's id and the
 * from-status, so deleting that payment can revert it (StudentDeactivation). A renewal paid in part
 * leaves the subscription ended: the recompute right after (StudentRenewal) moves it back to
 * pending_renewal, audited via subscription_ended (an expired student so lands on pending_renewal).
 */
@Injectable()
export class StudentActivation {
  constructor(private readonly statuses: StudentStatusQueries) {}

  async afterPayment(studentId: string, actorId: string, paymentId: string): Promise<boolean> {
    const student = await this.statuses.student(studentId);
    const plan = student ? paymentMove(student.status) : null;
    if (!plan) return false;
    const move = { studentId, from: plan.from, to: plan.to };
    const after = { via: 'payment', payment_id: paymentId, from: plan.from, reason: plan.reason };
    return this.statuses.move(move, { actorId, after });
  }
}
