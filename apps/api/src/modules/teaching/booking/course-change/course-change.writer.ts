import type { CourseChangeResult } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '../../../../common/db/db.module';
import { LessonEvents } from '../../../../common/events/lesson-events';
import { gateConfirmations } from '../../../../common/rules/confirmations';
import { NotificationPolicy } from '../../../messaging/notification-rules/policy/policy';
import { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import { callRpc } from '../../scheduling/rpc';
import { dbError } from '../../../../common/http/http';
import { CourseChangePlanner } from './course-change.planner';
import type { CourseTold } from './notices/course-change.notice-plan';
import { CourseChangeNotices } from './notices/course-change.notices';

const changeResult = z.object({ rule_ids: z.array(z.string()), ends_on: z.string().nullable() });

/** One change_course write and who hears it. */
interface CourseWrite {
  payload: Record<string, unknown>;
  subscriptionId: string;
  told: CourseTold;
}

/** change_course (migration 480) and its replay by clientRequestId (rule 8). Service role. */
@Injectable()
export class CourseChangeWriter {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly events: LessonEvents,
    private readonly policy: NotificationPolicy,
    private readonly notices: CourseChangeNotices,
  ) {}

  /** The change this clientRequestId already made (a retry), or null. */
  async replay(requestId: string, subscriptionId: string): Promise<CourseChangeResult | null> {
    const { data, error } = await this.db.from('schedule_rules').select('id').eq('client_request_id', requestId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    return this.result(await callRpc(this.db, 'course_change_result', { p_first: data.id }), subscriptionId);
  }

  /**
   * One transaction: the old rules end, their open lessons move, the new rules and lessons, the audit
   * row. Then the balance alerts (R-SUB-02) hear which lessons moved, as LessonStore.commit. Its
   * booking_confirmation* rows only while that notification rule is on (gateConfirmations) and the
   * family does not hear the move by lesson_rescheduled instead; then the teacher and the family
   * hear it (CourseChangeNotices, owner 2026-10-30).
   */
  async apply(change: CourseWrite): Promise<CourseChangeResult> {
    const { payload, told } = change;
    const listed: unknown[] = Array.isArray(payload.messages) ? payload.messages : [];
    const kept = await this.notices.prepare(told, await gateConfirmations(this.policy, listed));
    const p = Array.isArray(payload.messages) ? { ...payload, messages: kept.messages } : payload;
    const result = this.result(await callRpc(this.db, 'change_course', { p }), change.subscriptionId);
    await this.events.changed(told.moved.map((m) => m.id));
    await this.notices.announce(told, kept.changes);
    return result;
  }

  private result(data: unknown, subscriptionId: string): CourseChangeResult {
    const r = changeResult.parse(data);
    return { subscriptionId, ruleIds: r.rule_ids, endsOn: r.ends_on };
  }
}

/** The shared services CourseChange talks to (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class CourseChangeDeps {
  constructor(
    readonly checker: ConflictChecker,
    readonly planner: CourseChangePlanner,
    readonly writer: CourseChangeWriter,
  ) {}
}
