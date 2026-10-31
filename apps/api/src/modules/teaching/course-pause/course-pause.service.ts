import {
  addDays,
  coursePauseProblem,
  riyadhToday,
  RIYADH_TZ,
  type CoursePausePreview,
  type CoursePauseResult,
  type CoursePauseResume,
  type CoursePauseStart,
  type CoursePauseState,
  type CoursePauseUntil,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../../../common/http/errors';
import { startOfLocalDay } from '../scheduling';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import { toPauseView, type RpcOut } from './course-pause.mapper';
import { CoursePauseQueries } from './course-pause.queries';

type Actor = { id: string };
type StartInput = { studentId: string; body: CoursePauseStart; actor: Actor };
type UntilInput = { studentId: string; body: CoursePauseUntil; actor: Actor };
type ResumeInput = { studentId: string; body: CoursePauseResume; actor: Actor };

/** An old package-only pause lifted: no pause row, nothing cancelled or moved. */
const legacyResult = (subscriptionId: string): CoursePauseResult => {
  const today = riyadhToday();
  const now = new Date().toISOString();
  const pause = { id: subscriptionId, from_date: today, until_date: null, reason: null, created_at: now, created_by_name: null, resumed_at: now, extended_days: 0 };
  return { pause, cancelled: 0, left: 0, reopened: 0, conflicts: 0 };
};

/** Riyadh midnight at the start of `date` (UTC instant). */
const riyadhStart = (date: string): Date => startOfLocalDay(date, RIYADH_TZ);

/**
 * «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/11 §7b, docs/16 row 37c): ANY student, for whoever holds courses.pause
 * (admins and assistants by default). The work is one RPC each (migration 956); this checks the dates first (400),
 * then runs the follow-ups (CoursePauseFollowUps); the teacher and the family hear a pause or a
 * resume once.
 */
@Injectable()
export class CoursePauseService {
  constructor(
    private readonly queries: CoursePauseQueries,
    private readonly follow: CoursePauseFollowUps,
  ) {}

  async state(studentId: string): Promise<CoursePauseState> {
    await this.assertStudent(studentId);
    const views = (await this.queries.pauses(studentId)).map(toPauseView);
    return { open: views.find((v) => v.resumed_at === null) ?? null, history: views.filter((v) => v.resumed_at !== null) };
  }

  /** The sheet's «ستُلغى N حلقات»: open lessons from max(now, from) until the day after until (or all). */
  async preview(studentId: string, q: { from?: string; until?: string }): Promise<CoursePausePreview> {
    await this.assertStudent(studentId);
    const from = q.from ?? riyadhToday();
    const until = q.until ?? null;
    this.check(from, until);
    const start = new Date(Math.max(Date.now(), riyadhStart(from).getTime()));
    const end = until === null ? null : riyadhStart(addDays(until, 1));
    return { from_date: from, until_date: until, lessons: await this.queries.previewCount({ studentId, start, end }) };
  }

  async start({ studentId, body, actor }: StartInput): Promise<CoursePauseResult> {
    const from = body.fromDate ?? riyadhToday();
    const until = body.untilDate ?? null;
    this.check(from, until);
    const p = { student_id: studentId, from_date: from, until_date: until, reason: body.reason ?? null, actor: actor.id };
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

  /**
   * «استئناف الدورة» now (POST …/resume): the open pause, unless a package row's «استئناف» names another package.
   * Packages paused by the old package-only button (no pause row) are lifted instead (that row, or every paused one
   * of the student): back to their derived status, nothing else moved (it never cancelled a lesson); 409
   * pause_not_open when nothing was paused.
   */
  async resume({ studentId, body, actor }: ResumeInput): Promise<CoursePauseResult> {
    await this.assertStudent(studentId);
    const open = await this.queries.openPause(studentId);
    const subscriptionId = body.subscriptionId;
    if (open && (subscriptionId === undefined || subscriptionId === open.subscription_id)) return this.resumePause(open.id, actor.id);
    const lifted = await this.queries.liftLegacyPause({ studentId, ...(subscriptionId ? { subscriptionId } : {}) });
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
    return { pause: toPauseView(row), cancelled: out.cancelled.length, left: out.left.length, reopened, conflicts };
  }

  private check(from: string, until: string | null): void {
    const problem = coursePauseProblem({ from, until, today: riyadhToday() });
    if (problem) throw badRequest(problem);
  }

  private async openId(studentId: string): Promise<string> {
    await this.assertStudent(studentId);
    const open = await this.queries.openPause(studentId);
    if (!open) throw conflict('pause_not_open');
    return open.id;
  }

  private async assertStudent(studentId: string): Promise<void> {
    if (!(await this.queries.studentExists(studentId))) throw notFound('student_not_found');
  }
}
