import type { CancelBlock } from '@ab/money';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { afterCursor } from '@/common/db/page';
import { pgError } from '@/common/db/errors';
import { SELECT } from '@/modules/finance/subscriptions/list/subscriptions.list-query';
import type { SubRow } from '@/modules/finance/subscriptions/shared/subscriptions.repo';

const CANCELLED_LESSONS = '(cancelled_by_teacher,cancelled_by_admin)';

type CancelWrite = { id: string; actorId: string; reason: string | null; now: Date };
/** The package being cancelled, as ordered by subscription_commission_kind: (created_at, id). */
type LaterOf = { id: string; studentId: string; createdAt: string };
/** The cancelled row; null when it was already cancelled (a race); a block the DB guard raised (934). */
type CancelResult = { row: SubRow } | { row: null; block: CancelBlock };

/** Reads and the one write (service role; the controllers guard). */
@Injectable()
export class SubscriptionCancelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * What hangs on the package's course (schedule_rules.subscription_id, 470): its lessons not cancelled, plus
   * its active rules (a course booked beyond the horizon has none yet; the horizon job would book them).
   */
  async linkedLessons(subscriptionId: string): Promise<number> {
    const rules = await this.db
      .from('schedule_rules')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'active');
    if (rules.error) throw pgError(rules.error);
    const { count, error } = await this.db
      .from('lessons')
      .select('id, rule:schedule_rules!lessons_rule_id_fkey!inner(subscription_id)', { count: 'exact', head: true })
      .eq('rule.subscription_id', subscriptionId)
      .not('status', 'in', CANCELLED_LESSONS);
    if (error) throw pgError(error);
    return (rules.count ?? 0) + (count ?? 0);
  }

  /**
   * A later live priced package of the student, by (created_at, id), already has an assistant commission:
   * it was kinded 'renewal' because of this one, so cancelling would never earn the 'first' (409 has_commission).
   */
  async laterCommission(sub: LaterOf): Promise<boolean> {
    const live = this.db
      .from('subscriptions')
      .select('id')
      .eq('student_id', sub.studentId)
      .gt('price', 0)
      .neq('status', 'cancelled');
    const after = { at: sub.createdAt, id: sub.id };
    const later = await afterCursor(live, { column: 'created_at', ascending: true }, after);
    if (later.error) throw pgError(later.error);
    const ids = later.data.map((r) => r.id);
    if (ids.length === 0) return false;
    const { count, error } = await this.db.from('assistant_commissions').select('id', { count: 'exact', head: true }).in('subscription_id', ids);
    if (error) throw pgError(error);
    return (count ?? 0) > 0;
  }

  /** Compare-and-set: only a package not cancelled yet; the DB guard re-checks money, lessons and commission. */
  async cancel(w: CancelWrite): Promise<CancelResult> {
    const patch = { status: 'cancelled' as const, cancel_kind: 'unused', cancelled_at: w.now.toISOString(), cancelled_by: w.actorId, cancel_reason: w.reason };
    const { data, error } = await this.db
      .from('subscriptions')
      .update(patch)
      .eq('id', w.id)
      .neq('status', 'cancelled')
      .select(SELECT)
      .maybeSingle();
    if (error?.code === '23514' && error.message.startsWith('has_payments')) return { row: null, block: 'has_payments' };
    if (error?.code === '23514' && error.message.startsWith('has_lessons')) return { row: null, block: 'has_lessons' };
    if (error?.code === '23514' && error.message.startsWith('has_commission')) return { row: null, block: 'has_commission' };
    if (error) throw pgError(error);
    return data ? { row: data } : { row: null, block: 'already_cancelled' };
  }
}
