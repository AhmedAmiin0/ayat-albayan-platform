import { Injectable } from '@nestjs/common';
import { activatesStudent } from './student-activation';
import { isFlipBy, revertTarget } from './student-renewal.plan';
import { StudentRenewal } from './student-renewal';
import { StudentStatusQueries } from './student-status.queries';

export type DeletedPayment = { id: string; kind: string; amount: number | string };

/**
 * A deleted payment reverts the automatic flip it caused (owner 2026-10-12, docs/11 §7): only when the
 * newest status_change of the student is that payment's flip (a status set by hand, or a flip by another
 * payment, wins). No positive payment left → trial; another remains → active, or pending_renewal when the
 * subscription has ended. Compare-and-set on the flip's status, audited by the deleting admin, idempotent.
 */
@Injectable()
export class StudentDeactivation {
  constructor(
    private readonly statuses: StudentStatusQueries,
    private readonly renewal: StudentRenewal,
  ) {}

  async afterDelete(payment: DeletedPayment, ids: { studentId: string; actorId: string }): Promise<boolean> {
    if (!activatesStudent(payment)) return false;
    const last = await this.statuses.lastStatusChange(ids.studentId);
    if (!isFlipBy(last, payment.id)) return false;
    const student = await this.statuses.student(ids.studentId);
    if (!student) return false;
    const otherPayment = await this.statuses.hasPositivePayment(ids.studentId);
    const ended = otherPayment && (await this.renewal.ended(ids.studentId, student.tz));
    const to = revertTarget({ otherPayment, ended });
    if (to === student.status) return false;
    const move = { studentId: ids.studentId, from: student.status, to };
    return this.statuses.move(move, { actorId: ids.actorId, after: { via: 'payment_deleted', payment_id: payment.id } });
  }
}
