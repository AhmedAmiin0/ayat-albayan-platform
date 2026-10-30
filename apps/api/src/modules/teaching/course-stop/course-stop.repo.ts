import { OPEN_LESSON_STATUSES, type SubscriptionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { conflict, notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';

/** The package a stop reads (subscriptions row). */
export type StopSub = {
  id: string;
  student_id: string;
  status: SubscriptionStatus;
  currency: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
};

/** A weekly rule of the course that still reaches today or later. */
export type StopRule = { id: string; ends_on: string | null };

type Stamp = { id: string; actorId: string; reason: string; now: Date };

const SUB = 'id, student_id, status, currency, cancelled_at, cancelled_by, cancel_reason';

/** «إلغاء الاشتراك»'s reads and writes (service role; the route checks subscriptions.stop). */
@Injectable()
export class CourseStopRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 404 subscription_not_found (also for another student's package). */
  async subscription(id: string, studentId: string): Promise<StopSub> {
    const { data, error } = await this.db.from('subscriptions').select(SUB).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (data?.student_id !== studentId) throw notFound('subscription_not_found');
    return data;
  }

  /** The course's active rules (subscription_id, migration 470) not ended before `today` (UTC date). */
  async activeRules(subscriptionId: string, today: string): Promise<StopRule[]> {
    const { data, error } = await this.db
      .from('schedule_rules')
      .select('id, ends_on')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'active')
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  /** The course's open lessons from `now` on (any of its rules): what the stop cancels. */
  async futureLessons(subscriptionId: string, now: Date): Promise<string[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, rule:schedule_rules!lessons_rule_id_fkey!inner(subscription_id)')
      .eq('rule.subscription_id', subscriptionId)
      .in('status', [...OPEN_LESSON_STATUSES])
      .gte('starts_at', now.toISOString())
      .order('starts_at');
    if (error) throw dbError(error);
    return data.map((l) => l.id);
  }

  /** Net paid (payments − refunds): shown, never changed. */
  async paid(subscriptionId: string): Promise<number> {
    const { data, error } = await this.db.from('payments').select('amount, kind').eq('subscription_id', subscriptionId);
    if (error) throw dbError(error);
    return data.reduce((sum, p) => sum + (p.kind === 'refund' ? -Number(p.amount) : Number(p.amount)), 0);
  }

  /**
   * Compare-and-set to cancelled (kind 'stopped', migration 985) with who / when / why; null when it was
   * cancelled meanwhile. 409 has_future_lessons when the guard still finds an open lesson to come.
   */
  async stamp(w: Stamp): Promise<StopSub | null> {
    const patch = {
      status: 'cancelled' as const,
      cancel_kind: 'stopped',
      cancelled_at: w.now.toISOString(),
      cancelled_by: w.actorId,
      cancel_reason: w.reason,
    };
    const { data, error } = await this.db
      .from('subscriptions')
      .update(patch)
      .eq('id', w.id)
      .neq('status', 'cancelled')
      .select(SUB)
      .maybeSingle();
    if (error?.code === '23514' && error.message.startsWith('has_future_lessons')) throw conflict('has_future_lessons');
    if (error) throw dbError(error);
    return data;
  }

  /** The stop this clientRequestId already made (its audit row's after), or null. */
  async replay(subscriptionId: string, requestId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('after')
      .eq('entity', 'subscriptions')
      .eq('entity_id', subscriptionId)
      .eq('action', 'cancel')
      .eq('after->>client_request_id', requestId)
      .maybeSingle();
    if (error) throw dbError(error);
    const after = data?.after;
    return after !== null && typeof after === 'object' && !Array.isArray(after) ? after : null;
  }
}
