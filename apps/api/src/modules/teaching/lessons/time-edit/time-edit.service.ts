import { timeEditMode, type Conflict, type LessonTimeEdit, type TimeEditResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import type { TimeEditChange } from '../../scheduling/change-set';
import { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import { conflict, errorCode } from '../../../../common/http/errors';
import { studentIdsOf, type LessonRow } from '../store/lesson-row';
import { LessonStore } from '../store/lesson-store';
import { TimeEditPayout } from './time-edit.payout';
import { isSameTime, planTimeEdit, type TimeEditInput, type TimeEditPlan } from './time-edit.plan';
import { forMessages } from '../status/confirmation-messages';
import { timeEditMessages } from './time-edit.messages';

export type TimeEditArgs = { lessonId: string; body: LessonTimeEdit; actor: AuthUser };
/** What the edit set in motion; the controller adds the lesson view. */
export type TimeEditEffects = Omit<TimeEditResult, 'lesson'>;

const NOTHING: TimeEditEffects = { notified: 0, payout: 'none', pdf_refresh: false };
const iso = (d: Date): string => d.toISOString();

/**
 * «عدّل الوقت» (R-SCH-11, docs/10 §10): one lesson's date, start and length edited in place (same
 * row, report and payments). Admin only. A scheduled / confirmed lesson moves (`move`); a held one
 * is corrected on its own day with a reason (`correct`). The conflict check always applies; a
 * payout month that is approved or paid blocks a change it would have to re-price.
 */
@Injectable()
export class LessonTimeService {
  constructor(
    private readonly store: LessonStore,
    private readonly checker: ConflictChecker,
    private readonly payout: TimeEditPayout,
  ) {}

  async edit({ lessonId, body, actor }: TimeEditArgs): Promise<TimeEditEffects> {
    const row = await this.store.get(lessonId);
    const input = admit(row, body);
    // A replay (the edit already holds) is a 200 that writes nothing.
    if (!input) return NOTHING;
    const plan = planTimeEdit(input);
    const clashes = await this.clashes(row, plan);
    if (clashes.length > 0 && !body.override) throw conflict('conflict', { conflicts: clashes });
    const payout = await this.payout.check(row, plan);
    const messages = plan.notify ? await this.notices(row, plan) : [];
    const overrideReason = clashes.length > 0 ? (body.override?.reason ?? null) : null;
    try {
      await this.store.retime(changeOf({ row, plan, actor, messages, overrideReason }));
    } catch (e) {
      // Two identical requests at once: the loser finds the edit it asked for already in place.
      if (errorCode(e) === 'stale_time' && (await this.alreadyHolds(lessonId, body))) return NOTHING;
      throw e;
    }
    return { notified: messages.length, payout, pdf_refresh: plan.refreshPdf };
  }

  private async alreadyHolds(lessonId: string, body: LessonTimeEdit): Promise<boolean> {
    const now = await this.store.get(lessonId);
    return isSameTime(
      { startsAt: new Date(now.starts_at), endsAt: new Date(now.ends_at) },
      { ...body, startsAt: new Date(body.startsAt) },
    );
  }

  /**
   * One confirmation per guardian for the NEW start (admin-initiated: queued even with auto messages
   * off), naming no fixed link when the lesson's teacher holds it in our classroom (meetingLinkAuto).
   */
  private async notices(row: LessonRow, plan: TimeEditPlan): Promise<TimeEditChange['messages']> {
    const contacts = await this.store.queries.contacts(studentIdsOf(row));
    const lesson = forMessages({ ...row, starts_at: iso(plan.start) }, await this.store.queries.meetingLinkAuto({ teacherId: row.teacher_id }));
    return timeEditMessages(lesson, contacts);
  }

  private async clashes(row: LessonRow, plan: TimeEditPlan): Promise<Conflict[]> {
    const found = await this.checker.check({
      teacherId: row.teacher_id,
      studentIds: studentIdsOf(row),
      proposed: [{ starts_at: plan.start, ends_at: plan.end }],
      excludeIds: [row.id],
    });
    return found.filter((c) => !plan.ignoredConflicts.includes(c.kind));
  }
}

/**
 * 409 `time_edit_not_allowed` (closed status) or `stale_time` (the admin saw another start); null
 * for a replay. Otherwise the input of the plan.
 */
function admit(row: LessonRow, body: LessonTimeEdit): TimeEditInput | null {
  const mode = timeEditMode(row.status);
  if (!mode) throw conflict('time_edit_not_allowed', { status: row.status });
  const current = { startsAt: new Date(row.starts_at), endsAt: new Date(row.ends_at) };
  const request = { ...body, startsAt: new Date(body.startsAt) };
  if (isSameTime(current, request)) return null;
  const seenEnd = body.expectedEndsAt === undefined ? current.endsAt.getTime() : Date.parse(body.expectedEndsAt);
  if (Date.parse(body.expectedStartsAt) !== current.startsAt.getTime() || seenEnd !== current.endsAt.getTime()) {
    throw conflict('stale_time', { starts_at: iso(current.startsAt), ends_at: iso(current.endsAt) });
  }
  const zones = [row.teacher?.tz ?? 'UTC', ...row.lesson_students.map((s) => s.student?.tz ?? 'UTC')];
  return { mode, now: new Date(), current, request, zones };
}

type ChangeInput = {
  row: LessonRow;
  plan: TimeEditPlan;
  actor: AuthUser;
  messages: TimeEditChange['messages'];
  overrideReason: string | null;
};

function changeOf({ row, plan, actor, messages, overrideReason }: ChangeInput): TimeEditChange {
  const before = { starts_at: iso(new Date(row.starts_at)), ends_at: iso(new Date(row.ends_at)) };
  const to = { starts_at: iso(plan.start), ends_at: iso(plan.end) };
  return {
    actor: actor.id,
    lesson_id: row.id,
    from: { status: row.status, ...before },
    to,
    reason: plan.reason,
    override_reason: overrideReason,
    retime_open: plan.retimeOpen,
    refresh_pdf: plan.refreshPdf,
    messages,
    audit: {
      entity: 'lessons',
      entity_id: row.id,
      action: 'time_edit',
      before,
      after: { ...to, reason: plan.reason, override_reason: overrideReason, notified: messages.length, mode: plan.mode },
    },
  };
}
