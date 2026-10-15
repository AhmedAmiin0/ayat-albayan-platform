import { revertMove, type StudentStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { activatesStudent } from './student-activation';
import { isFlipBy, recordedFrom, revertTarget } from './student-renewal.plan';
import { StudentRenewal } from './student-renewal';
import { StudentStatusQueries } from './student-status.queries';

export type DeletedPayment = { id: string; kind: string; amount: number | string };

/**
 * A deleted payment reverts the automatic flip it caused (owner 2026-10-12, docs/11 §7): only when the
 * newest status_change of the student is that payment's flip (a status set by hand, or a flip by another
 * payment, wins). A flip that recorded its from-status (owner 2026-10-15) goes back to it while the student
 * is still active (revertMove). Older flips: no positive payment left → trial; another remains → active,
 * or pending_renewal when the subscription has ended. Compare-and-set, audited by the deleting admin.
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
    const from = recordedFrom(last);
    if (from) return this.revertTo(student.status, from, { payment, ids });
    const otherPayment = await this.statuses.hasPositivePayment(ids.studentId);
    const ended = otherPayment && (await this.renewal.ended(ids.studentId, student.tz));
    const to = revertTarget({ otherPayment, ended });
    if (to === student.status) return false;
    const move = { studentId: ids.studentId, from: student.status, to };
    return this.statuses.move(move, { actorId: ids.actorId, after: { via: 'payment_deleted', payment_id: payment.id } });
  }

  private async revertTo(
    current: StudentStatus,
    from: StudentStatus,
    o: { payment: DeletedPayment; ids: { studentId: string; actorId: string } },
  ): Promise<boolean> {
    const plan = revertMove(current, from);
    if (!plan) return false;
    const after = { via: 'payment_deleted', payment_id: o.payment.id, from: plan.from, reason: plan.reason };
    return this.statuses.move({ studentId: o.ids.studentId, from: plan.from, to: plan.to }, { actorId: o.ids.actorId, after });
  }
}
