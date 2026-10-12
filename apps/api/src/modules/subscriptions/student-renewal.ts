import { localDay, type StudentStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PackagesService, type StudentState } from './packages.service';
import { manualWins, packageEnded, renewalTarget, subscriptionEnded, type EndPackage } from './student-renewal.plan';
import { StudentStatusQueries } from './student-status.queries';
import { SubscriptionsQueries } from './subscriptions.queries';

/** What triggered the evaluation: a payment create (its id), the periodic sweep, or any other write / lesson change. */
export type RenewalCause = { via: 'payment'; paymentId: string } | { via: 'sweep' } | { via: 'event' };
export type RenewalInput = { studentId: string; state: StudentState; actorId: string | null; now: Date; cause: RenewalCause };

/** The packages as subscriptionEnded reads them (stored row + balance + payments). */
export function endPackages(state: StudentState): EndPackage[] {
  return state.rows.map((r) => ({
    status: r.status,
    renews_on: r.renews_on,
    price: Number(r.price),
    paid: state.ctx.paid.get(r.id) ?? 0,
    remaining: state.ctx.balances.get(r.id)?.remaining ?? r.lessons_total,
  }));
}

/**
 * «بانتظار التجديد» (owner 2026-10-12, docs/11 §7): after the package statuses are recomputed (every money
 * write, lesson change and the sweep), an `active` student whose subscription ended becomes
 * `pending_renewal`, and back to `active` once it runs again (a renewal payment). Never trial, paused or
 * churned. Compare-and-set + audit (via subscription_ended / payment + payment_id / subscription_renewed).
 * The sweep leaves a status the admin set by hand until the next automatic event (manualWins).
 */
@Injectable()
export class StudentRenewal {
  constructor(
    private readonly statuses: StudentStatusQueries,
    private readonly packages: PackagesService,
    private readonly subs: SubscriptionsQueries,
  ) {}

  async apply(input: RenewalInput): Promise<StudentStatus | null> {
    const student = await this.statuses.student(input.studentId);
    if (!student) return null;
    const today = localDay(input.now.toISOString(), student.tz);
    const pkgs = endPackages(input.state);
    const to = renewalTarget(student.status, subscriptionEnded(pkgs, today));
    if (!to) return null;
    if (input.cause.via === 'sweep' && (await this.manualWins(input.studentId, { pkgs, today, tz: student.tz }))) return null;
    const move = { studentId: input.studentId, from: student.status, to };
    const moved = await this.statuses.move(move, { actorId: input.actorId, after: viaOf(to, input.cause) });
    return moved ? to : null;
  }

  /** The student's subscription has ended today in its tz (StudentDeactivation's target). */
  async ended(studentId: string, tz: string, now = new Date()): Promise<boolean> {
    const rows = await this.subs.forStudent(studentId);
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

function viaOf(to: StudentStatus, cause: RenewalCause): Record<string, string> {
  if (to === 'pending_renewal') return { via: 'subscription_ended' };
  return cause.via === 'payment' ? { via: 'payment', payment_id: cause.paymentId } : { via: 'subscription_renewed' };
}
