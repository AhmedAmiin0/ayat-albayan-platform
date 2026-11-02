import { isNotSubscribed, revertMove, type StudentStatus, type TrialFacts } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { activatesStudent } from './student-activation';
import { isFlipBy, recordedFrom, revertTarget } from './student-renewal.plan';
import { StudentRenewal } from './student-renewal';
import { StudentStatusRepo } from './student-status.repo';
import { NO_TRIAL, trialFactsOf } from '@/modules/finance/subscriptions/trial/student-trial.plan';
import { StudentTrialRepo } from '@/modules/finance/subscriptions/trial/student-trial.repo';

export interface DeletedPayment {
  id: string;
  kind: string;
  amount: number | string;
}
interface Ids {
  studentId: string;
  actorId: string;
}
interface Ctx {
  payment: DeletedPayment;
  ids: Ids;
  current: StudentStatus;
  tz: string;
}

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
    private readonly statuses: StudentStatusRepo,
    private readonly renewal: StudentRenewal,
    private readonly trials: StudentTrialRepo,
  ) {}

  async afterDelete(payment: DeletedPayment, ids: Ids): Promise<boolean> {
    const flipped = await this.flippedBy(payment, ids.studentId);
    if (!flipped) return false;
    const ctx: Ctx = { payment, ids, current: flipped.student.status, tz: flipped.student.tz };
    return this.revertFlip(recordedFrom(flipped.last), ctx);
  }

  /** The student and its newest status_change, only when that change is this payment's flip. */
  private async flippedBy(payment: DeletedPayment, studentId: string) {
    if (!activatesStudent(payment)) return null;
    const last = await this.statuses.lastStatusChange(studentId);
    const student = isFlipBy(last, payment.id) ? await this.statuses.student(studentId) : null;
    return student ? { last, student } : null;
  }

  /** A recorded subscribed from wins; a not-subscribed one only when no other positive payment remains. */
  private async revertFlip(from: StudentStatus | null, ctx: Ctx): Promise<boolean> {
    if (from && !isNotSubscribed(from)) return this.revertTo(from, ctx);
    const otherPayment = await this.statuses.hasPositivePayment(ctx.ids.studentId);
    return from && !otherPayment ? this.revertTo(from, ctx) : this.revertByFacts(otherPayment, ctx);
  }

  /** revertTarget: another payment → active / pending_renewal; none → by the trial facts. */
  private async revertByFacts(otherPayment: boolean, o: Ctx): Promise<boolean> {
    const ended = otherPayment && (await this.renewal.ended(o.ids.studentId, o.tz));
    const facts = otherPayment ? NO_TRIAL : await this.trialFacts(o.ids.studentId);
    const to = revertTarget({ otherPayment, ended, facts });
    const move = { studentId: o.ids.studentId, from: o.current, to };
    const audit = { actorId: o.ids.actorId, after: { via: 'payment_deleted', payment_id: o.payment.id } };
    return to === o.current ? false : this.statuses.move(move, audit);
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
