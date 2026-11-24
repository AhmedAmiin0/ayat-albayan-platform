import { paymentMove } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StudentStatusRepo } from './student-status.repo';

/** A positive recorded payment (not a refund) is what turns a trial student into subscribed. */
export function activatesStudent(row: unknown): boolean {
  if (typeof row !== 'object' || row === null) return false;
  const kind = 'kind' in row ? row.kind : undefined;
  const amount = 'amount' in row ? Number(row.amount) : 0;
  return kind === 'payment' && amount > 0;
}

/** Positive payment activates via compare-and-set (docs/11 §7); paused or churned untouched. */
@Injectable()
export class StudentActivation {
  constructor(private readonly statuses: StudentStatusRepo) {}

  async afterPayment(studentId: string, actorId: string, paymentId: string): Promise<boolean> {
    const student = await this.statuses.student(studentId);
    const plan = student ? paymentMove(student.status) : null;
    if (!plan) return false;
    const move = { studentId, from: plan.from, to: plan.to };
    const after = { via: 'payment', payment_id: paymentId, from: plan.from, reason: plan.reason };
    return this.statuses.move(move, { actorId, after });
  }
}
