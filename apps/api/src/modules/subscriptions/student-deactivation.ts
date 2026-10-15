import { isNotSubscribed, revertMove, type StudentStatus, type TrialFacts } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { activatesStudent } from './student-activation';
import { isFlipBy, recordedFrom, revertTarget } from './student-renewal.plan';
import { StudentRenewal } from './student-renewal';
import { StudentStatusQueries } from './student-status.queries';
import { NO_TRIAL, trialFactsOf } from './student-trial.plan';
import { StudentTrialQueries } from './student-trial.queries';

export type DeletedPayment = { id: string; kind: string; amount: number | string };
type Ctx = { payment: DeletedPayment; ids: { studentId: string; actorId: string }; current: StudentStatus };

/**
 * A deleted payment reverts the automatic flip it caused (owner 2026-10-12, docs/11 §7): only when the
 * newest status_change of the student is that payment's flip (a status set by hand, or a flip by another
 * payment, wins). A recorded from of pending_renewal / expired goes back to it while still active
 * (revertMove). A recorded not-subscribed from (owner 2026-10-15) does so only when no other positive
 * payment remains; else, like an older flip without a recorded from, revertTarget: another payment →
 * active, or pending_renewal when the subscription has ended; none → by the trial facts (new / trial /
 * pending_subscription). Compare-and-set, audited by the deleting admin.
 */
@Injectable()
export class StudentDeactivation {
  constructor(
    private readonly statuses: StudentStatusQueries,
    private readonly renewal: StudentRenewal,
    private readonly trials: StudentTrialQueries,
  ) {}

  async afterDelete(payment: DeletedPayment, ids: { studentId: string; actorId: string }): Promise<boolean> {
    if (!activatesStudent(payment)) return false;
    const last = await this.statuses.lastStatusChange(ids.studentId);
    if (!isFlipBy(last, payment.id)) return false;
    const student = await this.statuses.student(ids.studentId);
    if (!student) return false;
    const ctx: Ctx = { payment, ids, current: student.status };
    const from = recordedFrom(last);
    if (from && !isNotSubscribed(from)) return this.revertTo(from, ctx);
    const otherPayment = await this.statuses.hasPositivePayment(ids.studentId);
    if (from && !otherPayment) return this.revertTo(from, ctx);
    const ended = otherPayment && (await this.renewal.ended(ids.studentId, student.tz));
    const facts = otherPayment ? NO_TRIAL : await this.trialFacts(ids.studentId);
    const to = revertTarget({ otherPayment, ended, facts });
    if (to === student.status) return false;
    const move = { studentId: ids.studentId, from: student.status, to };
    return this.statuses.move(move, { actorId: ids.actorId, after: { via: 'payment_deleted', payment_id: payment.id } });
  }

  private async trialFacts(studentId: string): Promise<TrialFacts> {
    return trialFactsOf(await this.trials.lessonsOf([studentId])).get(studentId) ?? NO_TRIAL;
  }

  private async revertTo(from: StudentStatus, o: Ctx): Promise<boolean> {
    const plan = revertMove(o.current, from);
    if (!plan) return false;
    const after = { via: 'payment_deleted', payment_id: o.payment.id, from: plan.from, reason: plan.reason };
    return this.statuses.move({ studentId: o.ids.studentId, from: plan.from, to: plan.to }, { actorId: o.ids.actorId, after });
  }
}
