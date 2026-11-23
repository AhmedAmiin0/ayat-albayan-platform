import { livePackages, type StudentBalanceView, type SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { BalanceRepo } from './balance.repo';
import { statusChanges, withChanges } from './packages.plan';
import { toStudentBalance, toSubscriptionView, type SubContext } from '@/modules/finance/subscriptions/subscriptions.mapper';
import { SubscriptionsRepo, type SubRow } from '@/modules/finance/subscriptions/subscriptions.repo';

type PackageRow = Omit<SubRow, 'student'>;
export interface StudentState {
  /** FIFO order, statuses as stored after the recompute. */
  rows: PackageRow[];
  ctx: SubContext;
}
type StatusChange = ReturnType<typeof statusChanges>[number];

/**
 * A student's packages with their balances and payments, and the status recompute that runs after
 * every payment, package create/delete and alerts evaluation (R-SUB-01/02, journey 3).
 */
@Injectable()
export class PackagesService {
  constructor(
    private readonly subs: SubscriptionsRepo,
    private readonly balances: BalanceRepo,
    private readonly audit: AuditService,
    private readonly events: PackageEvents,
  ) {}

  async context(rows: readonly Pick<SubRow, 'id' | 'currency'>[]): Promise<SubContext> {
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

  /**
   * Writes subscriptionStatusFor for each package of these students; audited as the actor. The
   * reads are three set reads whatever the number of students (the alerts sweep, BE-07). A
   * cancelled package is left out of everything here (statuses, alerts, renewal): never rewritten,
   * never the newest. Each package moved to 'active' tells PackageEvents, so its course draft is
   * booked (idempotent).
   */
  async recomputeMany(studentIds: readonly string[], actorId: string | null): Promise<Map<string, StudentState>> {
    const rows = livePackages(await this.subs.forStudents(studentIds));
    const ctx = await this.context(rows);
    const states = new Map(studentIds.map((id) => [id, { rows: rows.filter((r) => r.student_id === id), ctx }]));
    const changes = [...states.values()].flatMap((s) => statusChanges({ subs: s.rows, ...ctx }));
    await this.write(changes, actorId);
    for (const c of changes.filter(isActivation)) await this.events.paid(c.id);
    const after = (s: StudentState): StudentState => ({ rows: withChanges(s.rows, changes), ctx });
    return new Map([...states].map(([id, s]) => [id, after(s)]));
  }

  private async write(changes: readonly StatusChange[], actorId: string | null): Promise<void> {
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
  }

  /** GET /students/:id/balance (S6). Read only: statuses are kept fresh by writes and the sweep. */
  async studentBalance(studentId: string): Promise<StudentBalanceView> {
    return toStudentBalance(studentId, await this.views(await this.subs.forStudent(studentId)));
  }
}

const isActivation = (c: { to: string }): boolean => c.to === 'active';
