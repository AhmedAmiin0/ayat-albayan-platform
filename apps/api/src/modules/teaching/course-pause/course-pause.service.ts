import type {
  CoursePauseResult,
  CoursePauseResume,
  CoursePauseStart,
  CoursePauseState,
  CoursePauseUntil,
} from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { assertPauseDates, assertStudent } from './preview/course-pause.guards';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import { toPauseView, type RpcOut } from './course-pause.mapper';
import { CoursePauseRepo } from './course-pause.repo';

type Actor = { id: string };
type StartInput = { studentId: string; body: CoursePauseStart; actor: Actor };
type UntilInput = { studentId: string; body: CoursePauseUntil; actor: Actor };
type ResumeInput = { studentId: string; body: CoursePauseResume; actor: Actor };

/** An old package-only pause lifted: no pause row, nothing cancelled or moved. */
const legacyResult = (subscriptionId: string): CoursePauseResult => {
  const today = riyadhToday();
  const now = new Date().toISOString();
  const pause = {
    id: subscriptionId,
    from_date: today,
    until_date: null,
    reason: null,
    created_at: now,
    created_by_name: null,
    resumed_at: now,
    extended_days: 0,
  };
  return { pause, cancelled: 0, left: 0, reopened: 0, conflicts: 0 };
};

/** Course pause (docs/11 §7b): one RPC each (migration 956); teacher and family are told once. */
@Injectable()
export class CoursePauseService {
  constructor(
    private readonly queries: CoursePauseRepo,
    private readonly follow: CoursePauseFollowUps,
  ) {}

  async state(studentId: string): Promise<CoursePauseState> {
    await assertStudent(this.queries, studentId);
    const views = (await this.queries.pauses(studentId)).map(toPauseView);
    return {
      open: views.find((v) => v.resumed_at === null) ?? null,
      history: views.filter((v) => v.resumed_at !== null),
    };
  }

  async start({ studentId, body, actor }: StartInput): Promise<CoursePauseResult> {
    const from = body.fromDate ?? riyadhToday();
    const until = body.untilDate ?? null;
    assertPauseDates(from, until);
    const p = {
      student_id: studentId,
      from_date: from,
      until_date: until,
      reason: body.reason ?? null,
      actor: actor.id,
    };
    const out = await this.queries.call('course_pause_start', p);
    const result = await this.done(out, actor.id);
    await this.follow.paused(out, actor.id);
    return result;
  }

  /** Extend or shorten the open pause; lessons after a shortened end come back (clash-checked). */
  async setUntil({ studentId, body, actor }: UntilInput): Promise<CoursePauseResult> {
    const id = await this.openId(studentId);
    const p = { pause_id: id, until_date: body.untilDate, actor: actor.id };
    return this.done(await this.queries.call('course_pause_set_until', p), actor.id);
  }

  /** Legacy package-only pauses are lifted instead; 409 pause_not_open when nothing was paused. */
  async resume({ studentId, body, actor }: ResumeInput): Promise<CoursePauseResult> {
    await assertStudent(this.queries, studentId);
    const open = await this.queries.openPause(studentId);
    const subscriptionId = body.subscriptionId;
    if (open && (subscriptionId === undefined || subscriptionId === open.subscription_id))
      return this.resumePause(open.id, actor.id);
    const lifted = await this.queries.liftLegacyPause({
      studentId,
      ...(subscriptionId ? { subscriptionId } : {}),
    });
    const [first] = lifted;
    if (first === undefined) throw conflict('pause_not_open');
    await this.follow.liftedLegacy({ studentId, subscriptionIds: lifted, actorId: actor.id });
    return legacyResult(first);
  }

  /** Also the daily job's (actor null). Idempotent: an already resumed pause changes nothing (the RPC answers resumed false). */
  async resumePause(pauseId: string, actorId: string | null): Promise<CoursePauseResult> {
    const out = await this.queries.call('course_pause_resume', { pause_id: pauseId, actor: actorId });
    if (out.resumed === false) return this.result(out, 0);
    const result = await this.done(out, actorId);
    await this.follow.resumed(out, actorId);
    return result;
  }

  /** The hourly job: a pause from a later day begins on its from day (idempotent: started false changes nothing). */
  async beginPause(pauseId: string): Promise<void> {
    const out = await this.queries.call('course_pause_begin', { pause_id: pauseId, actor: null });
    if (!out.started) return;
    await this.follow.after(out, null);
    // Usually told at start already (same pause: one notice); this covers lessons booked since.
    await this.follow.paused(out, null);
  }

  private async done(out: RpcOut, actorId: string | null): Promise<CoursePauseResult> {
    return this.result(out, await this.follow.after(out, actorId));
  }

  private async result(out: RpcOut, conflicts: number): Promise<CoursePauseResult> {
    const row = await this.queries.pause(out.id);
    if (!row) throw notFound('pause_not_found');
    const reopened = out.reopened.length + out.rejoined.length;
    return {
      pause: toPauseView(row),
      cancelled: out.cancelled.length,
      left: out.left.length,
      reopened,
      conflicts,
    };
  }

  private async openId(studentId: string): Promise<string> {
    await assertStudent(this.queries, studentId);
    const open = await this.queries.openPause(studentId);
    if (!open) throw conflict('pause_not_open');
    return open.id;
  }
}
