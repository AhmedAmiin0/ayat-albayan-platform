import type { CourseChangeResult } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '../../common/db/db.module';
import { LessonEvents } from '../../common/events/lesson-events';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { callRpc } from '../scheduling/rpc';
import { SettingsService } from '../../common/settings/settings.service';
import { dbError } from '../teachers/http';

const changeResult = z.object({ rule_ids: z.array(z.string()), ends_on: z.string().nullable() });

/** change_course (migration 480) and its replay by clientRequestId (rule 8). Service role. */
@Injectable()
export class CourseChangeWriter {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly events: LessonEvents,
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
   * row. Then the balance alerts (R-SUB-02) hear which lessons moved, as LessonStore.commit.
   */
  async apply(change: { payload: Record<string, unknown>; subscriptionId: string; moved: readonly string[] }): Promise<CourseChangeResult> {
    const result = this.result(await callRpc(this.db, 'change_course', { p: change.payload }), change.subscriptionId);
    await this.events.changed(change.moved);
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
    readonly settings: SettingsService,
    readonly writer: CourseChangeWriter,
  ) {}
}
