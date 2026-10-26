import type { StudentBalanceView, SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { BalanceQueries } from './balance.queries';
import { statusChanges, withChanges } from './packages.plan';
import { toStudentBalance, toSubscriptionView, type SubContext } from '../subscriptions.mapper';
import { SubscriptionsQueries, type SubRow } from '../subscriptions.queries';

export interface StudentState {
  /** FIFO order, statuses as stored after the recompute. */
  rows: SubRow[];
  ctx: SubContext;
}

/**
 * A student's packages with their balances and payments, and the status recompute that runs after
 * every payment, package create/delete and alerts evaluation (R-SUB-01/02, journey 3).
 */
@Injectable()
export class PackagesService {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly balances: BalanceQueries,
    private readonly audit: AuditService,
  ) {}

  async context(rows: readonly SubRow[]): Promise<SubContext> {
    const [balances, paid] = await Promise.all([
      this.balances.forSubscriptions(rows.map((r) => r.id)),
      this.subs.paid(rows),
    ]);
    return { balances, paid };
  }

  async views(rows: readonly SubRow[]): Promise<SubscriptionView[]> {
    const ctx = await this.context(rows);
    return rows.map((r) => toSubscriptionView(r, ctx));
  }

  /** Writes subscriptionStatusFor for each of the student's packages; audited as the actor. */
  async recompute(studentId: string, actorId: string | null): Promise<StudentState> {
    const rows = await this.subs.forStudent(studentId);
    const ctx = await this.context(rows);
    const changes = statusChanges({ subs: rows, balances: ctx.balances, paid: ctx.paid });
    for (const c of changes) {
      await this.subs.update(c.id, { status: c.to });
      await this.audit.record({
        actorId,
        entity: 'subscriptions',
        entityId: c.id,
        action: 'status_change',
        before: { status: c.from },
        after: { status: c.to },
      });
    }
    return { rows: withChanges(rows, changes), ctx };
  }

  /** GET /students/:id/balance (S6). Read only: statuses are kept fresh by writes and the sweep. */
  async studentBalance(studentId: string): Promise<StudentBalanceView> {
    return toStudentBalance(studentId, await this.views(await this.subs.forStudent(studentId)));
  }
}
