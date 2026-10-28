import type { CancelBlock } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import { SELECT } from '../list/subscriptions.list-query';
import type { SubRow } from '../subscriptions.queries';

const CANCELLED_LESSONS = '(cancelled_by_teacher,cancelled_by_admin)';

type CancelWrite = { id: string; actorId: string; reason: string | null; now: Date };
/** The cancelled row; null when it was already cancelled (a race); a block the DB guard raised (934). */
type CancelResult = { row: SubRow } | { row: null; block: CancelBlock };

/** «إلغاء الباقة» reads and the one write (service role; the controllers guard). Owner 2026-10-28. */
@Injectable()
export class SubscriptionCancelQueries {
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
    if (rules.error) throw dbError(rules.error);
    const { count, error } = await this.db
      .from('lessons')
      .select('id, rule:schedule_rules!lessons_rule_id_fkey!inner(subscription_id)', { count: 'exact', head: true })
      .eq('rule.subscription_id', subscriptionId)
      .not('status', 'in', CANCELLED_LESSONS);
    if (error) throw dbError(error);
    return (rules.count ?? 0) + (count ?? 0);
  }

  /** Compare-and-set: only a package not cancelled yet; the DB guard re-checks money and lessons. */
  async cancel(w: CancelWrite): Promise<CancelResult> {
    const patch = { status: 'cancelled' as const, cancelled_at: w.now.toISOString(), cancelled_by: w.actorId, cancel_reason: w.reason };
    const { data, error } = await this.db
      .from('subscriptions')
      .update(patch)
      .eq('id', w.id)
      .neq('status', 'cancelled')
      .select(SELECT)
      .maybeSingle();
    if (error?.code === '23514' && error.message.startsWith('has_payments')) return { row: null, block: 'has_payments' };
    if (error?.code === '23514' && error.message.startsWith('has_lessons')) return { row: null, block: 'has_lessons' };
    if (error) throw dbError(error);
    return data ? { row: data } : { row: null, block: 'already_cancelled' };
  }
}
