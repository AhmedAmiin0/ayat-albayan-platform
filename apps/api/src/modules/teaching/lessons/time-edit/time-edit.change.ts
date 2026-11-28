import { timeEditMode, type Conflict, type LessonTimeEdit } from '@ab/schedule';
import type { AuthUser } from '@/common/auth/verify-token';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import { conflict } from '@/common/http/errors';
import type { TimeEditChange } from '@/modules/teaching/scheduling';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { isSameTime, type TimeEditInput, type TimeEditPlan } from './time-edit.plan';

export const iso = (d: Date): string => d.toISOString();

interface Span {
  startsAt: Date;
  endsAt: Date;
}

/** The admin edited the time they saw: the expected start and (when sent) the expected end. */
function sawCurrent(body: LessonTimeEdit, current: Span): boolean {
  const { expectedStartsAt, expectedEndsAt } = body;
  const end = expectedEndsAt === undefined ? current.endsAt.getTime() : Date.parse(expectedEndsAt);
  const start = Date.parse(expectedStartsAt);
  return start === current.startsAt.getTime() && end === current.endsAt.getTime();
}

const zonesOf = (row: LessonRow): string[] => [
  row.teacher?.tz ?? 'UTC',
  ...row.lesson_students.map((s) => s.student?.tz ?? 'UTC'),
];

/**
 * 409 `time_edit_not_allowed` (closed status) or `stale_time` (the admin saw another start); null
 * for a replay. Otherwise the input of the plan.
 */
export function admit(row: LessonRow, body: LessonTimeEdit): TimeEditInput | null {
  const mode = timeEditMode(row.status);
  if (!mode) throw conflict('time_edit_not_allowed', { status: row.status });
  const current = { startsAt: new Date(row.starts_at), endsAt: new Date(row.ends_at) };
  const request = { ...body, startsAt: new Date(body.startsAt) };
  if (isSameTime(current, request)) return null;
  if (!sawCurrent(body, current)) {
    throw conflict('stale_time', { starts_at: iso(current.startsAt), ends_at: iso(current.endsAt) });
  }
  return { mode, now: new Date(), current, request, zones: zonesOf(row) };
}

/** 409 conflict on a clash the admin did not override; the override's reason only on a clash. */
export function overrideOf(clashes: Conflict[], body: LessonTimeEdit): string | null {
  if (clashes.length === 0) return null;
  if (!body.override) throw conflict('conflict', { conflicts: clashes });
  return body.override.reason;
}

interface NoticeInput {
  row: LessonRow;
  plan: TimeEditPlan;
  actor: AuthUser;
}

/**
 * The teacher and the family hear the new time (ScheduleNotices; a past lesson: nobody), only when
 * the admin left «notify» on AND the start moved: a length-only edit or notify:false tells nobody.
 */
export function movedNotice({ row, plan, actor }: NoticeInput): ScheduleChange | undefined {
  if (!plan.notify || !plan.startChanged) return undefined;
  const fromStartsAt = row.starts_at;
  return { kind: 'lesson_rescheduled', lessonId: row.id, fromStartsAt, actorId: actor.id };
}

interface ChangeInput {
  row: LessonRow;
  plan: TimeEditPlan;
  actor: AuthUser;
  messages: TimeEditChange['messages'];
  overrideReason: string | null;
}

export function changeOf(input: ChangeInput): TimeEditChange {
  const { row, plan, actor, messages, overrideReason } = input;
  const before = { starts_at: iso(new Date(row.starts_at)), ends_at: iso(new Date(row.ends_at)) };
  const to = { starts_at: iso(plan.start), ends_at: iso(plan.end) };
  const reasons = { reason: plan.reason, override_reason: overrideReason };
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
      after: { ...to, ...reasons, notified: messages.length, mode: plan.mode },
    },
  };
}
