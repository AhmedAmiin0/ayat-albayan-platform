import { currentPackage, type SubscriptionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { conflict, notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';
import { stopPlan, stopRow, type StopPlan, type StopRow } from './course-stop.mapper';

/** The package a stop reads (subscriptions row). */
export interface StopSub {
  id: string;
  student_id: string;
  status: SubscriptionStatus;
  currency: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
}

/** stop_course's input (migration 991). */
interface StopCall {
  subscriptionId: string;
  studentId: string;
  requestId: string;
  actorId: string;
  reason: string;
}

const SUB = 'id, student_id, status, currency, cancelled_at, cancelled_by, cancel_reason';
/** stop_course's raised codes (P0001) and the 409s among them; the rest is 404. */
const RAISED = new Set(['subscription_not_found', 'already_cancelled', 'course_unattributed']);

/** stop_course / the guard's errors → HTTP. */
function stopError(error: PostgrestError): Error {
  if (error.code === 'P0001' && RAISED.has(error.message))
    return error.message === 'subscription_not_found' ? notFound(error.message) : conflict(error.message);
  if (error.code === '23514' && error.message.startsWith('has_future_lessons'))
    return conflict('has_future_lessons');
  return dbError(error);
}

/**
 * «إلغاء الاشتراك»'s reads and its one-transaction write (service role; the route checks
 * subscriptions.stop).
 */
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

  /** The student's current package (currentPackage: newest active, else newest live); 404 none. */
  async current(studentId: string): Promise<StopSub> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select(SUB)
      .eq('student_id', studentId)
      .order('starts_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw dbError(error);
    const sub = currentPackage(data);
    if (!sub) throw notFound('subscription_not_found');
    return sub;
  }

  /**
   * course_stop_plan: the rules a stop at `now` ends and the open lessons it cancels, found through
   * course_rules_of (a rule without subscription_id counts when it runs in the package's period).
   */
  async plan(subscriptionId: string, now: Date): Promise<StopPlan> {
    const args = { p_subscription: subscriptionId, p_at: now.toISOString() };
    const { data, error } = await this.db.rpc('course_stop_plan', args);
    if (error) throw dbError(error);
    return stopPlan(data);
  }

  /** Net paid (payments − refunds): shown, never changed. */
  async paid(subscriptionId: string): Promise<number> {
    const { data, error } = await this.db
      .from('payments')
      .select('amount, kind')
      .eq('subscription_id', subscriptionId);
    if (error) throw dbError(error);
    return data.reduce((sum, p) => sum + (p.kind === 'refund' ? -p.amount : p.amount), 0);
  }

  /**
   * stop_course: the whole stop in one transaction (its stamp carries requestId, so a retry or a
   * double tap answers the first stop). 404 subscription_not_found, 409 already_cancelled /
   * course_unattributed / has_future_lessons.
   */
  async stop(c: StopCall): Promise<StopRow> {
    const p = {
      subscription_id: c.subscriptionId,
      student_id: c.studentId,
      client_request_id: c.requestId,
      actor: c.actorId,
      reason: c.reason,
    };
    const { data, error } = await this.db.rpc('stop_course', { p });
    if (error) throw stopError(error);
    return stopRow(data);
  }
}
