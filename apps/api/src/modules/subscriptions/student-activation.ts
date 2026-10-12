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
 * Trial → active on the first payment (owner 2026-10-12, docs/11 §7): whoever records it (admin or the
 * salesperson), a student still in `trial` becomes `active` («مشترك») in the same API flow. Compare-and-set
 * on status = 'trial', so it is idempotent (a retried form re-runs it safely) and a paused or churned
 * student is never touched; audited as a status_change by the recorder with the payment's id, so deleting
 * that payment can revert it (StudentDeactivation).
 */
@Injectable()
export class StudentActivation {
  constructor(private readonly statuses: StudentStatusQueries) {}

  afterPayment(studentId: string, actorId: string, paymentId: string): Promise<boolean> {
    const move = { studentId, from: 'trial', to: 'active' } as const;
    return this.statuses.move(move, { actorId, after: { via: 'payment', payment_id: paymentId } });
  }
}
