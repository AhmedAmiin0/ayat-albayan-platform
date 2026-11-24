import { livePackages, localDay, type StudentStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PackagesService, type StudentState } from '@/modules/finance/subscriptions/money/packages.service';
import { manualWins, packageEnded, renewalTarget, subscriptionEnded, type EndPackage } from './student-renewal.plan';
import { StudentStatusRepo } from './student-status.repo';
import type { StudentTz } from './student-status.types';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';

/** What triggered the evaluation: a payment create (its id), the periodic sweep, or any other write / lesson change. */
export type RenewalCause = { via: 'payment'; paymentId: string } | { via: 'sweep' } | { via: 'event' };
type RenewalInput = {
  studentId: string;
  student: StudentTz;
  state: StudentState;
  actorId: string | null;
  now: Date;
  cause: RenewalCause;
};

/** The packages as subscriptionEnded reads them (stored row + balance + payments). */
function endPackages(state: StudentState): EndPackage[] {
  return state.rows.map((r) => ({
    status: r.status,
    renews_on: r.renews_on,
    price: Number(r.price),
    paid: state.ctx.paid.get(r.id) ?? 0,
    remaining: state.ctx.balances.get(r.id)?.remaining ?? r.lessons_total,
  }));
}

/** Active with an ended package goes pending_renewal, and back on renewal; manual wins. */
@Injectable()
export class StudentRenewal {
  constructor(
    private readonly statuses: StudentStatusRepo,
    private readonly packages: PackagesService,
    private readonly subs: SubscriptionsRepo,
  ) {}

  async apply(input: RenewalInput): Promise<StudentStatus | null> {
    const { student } = input;
    const today = localDay(input.now.toISOString(), student.tz);
    const pkgs = endPackages(input.state);
    const to = renewalTarget(student.status, subscriptionEnded(pkgs, today));
    if (!to) return null;
    if (input.cause.via === 'sweep' && (await this.manualWins(input.studentId, { pkgs, today, tz: student.tz }))) return null;
    const move = { studentId: input.studentId, from: student.status, to };
    const moved = await this.statuses.move(move, { actorId: input.actorId, after: viaOf(move, input.cause) });
    return moved ? to : null;
  }

  /** The status and tz of many students in one read (the alerts evaluate them in batch). */
  async students(studentIds: readonly string[]): Promise<Map<string, StudentTz>> {
    return this.statuses.students(studentIds);
  }

  /** The student's subscription has ended today in its tz (StudentDeactivation's target). */
  async ended(studentId: string, tz: string, now = new Date()): Promise<boolean> {
    const rows = livePackages(await this.subs.forStudent(studentId));
    const pkgs = endPackages({ rows, ctx: await this.packages.context(rows) });
    return subscriptionEnded(pkgs, localDay(now.toISOString(), tz));
  }

  private async manualWins(studentId: string, s: { pkgs: EndPackage[]; today: string; tz: string }): Promise<boolean> {
    const last = await this.statuses.lastStatusChange(studentId);
    if (!last) return false;
    const renewDates = s.pkgs.flatMap((p) => (p.renews_on !== null && packageEnded(p, s.today) ? [p.renews_on] : []));
    return manualWins(last, { renewDates, localDay: localDay(last.at, s.tz) });
  }
}

/** A payment flip records its from-status, so deleting the payment reverts to it (StudentDeactivation). */
function viaOf(m: { from: StudentStatus; to: StudentStatus }, cause: RenewalCause): Record<string, string> {
  if (m.to === 'pending_renewal') return { via: 'subscription_ended' };
  if (cause.via !== 'payment') return { via: 'subscription_renewed' };
  return { via: 'payment', payment_id: cause.paymentId, from: m.from, reason: 'payment' };
}
