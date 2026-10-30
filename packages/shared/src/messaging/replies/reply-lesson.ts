import type { LessonStatus } from '../../enums/index.js';
import { chatDayKey, RIYADH_TZ } from '../../core/format/index.js';
import { isOpenLesson } from '../../lessons/index.js';
import type { Permission } from '../../permissions/index.js';
import type { MessageView, ThreadLesson } from '../chat/views.js';

// Which lesson a guardian's quick reply is about, and what the viewer may do to it from the chat
// (owner 2026-10-28: the note under «تأجيل الحلقة» / «ايوه» carries the action). Pure; web and mobile alike.

/** The lesson a reply refers to; `status` null = an old cache's family lesson (open, by the API's filter). */
export interface ReplyLesson {
  id: string;
  starts_at: string;
  ends_at: string | null;
  status: LessonStatus | null;
}

type ReplyOf = Pick<MessageView, 'lesson_id' | 'lesson' | 'created_at'>;

/** Not over at `now` (its end, else its start when an old cache lacks the end). */
export function lessonNotEnded(lesson: ReplyLesson, now: Date): boolean {
  return Date.parse(lesson.ends_at ?? lesson.starts_at) > now.getTime();
}

const isOpen = (status: LessonStatus | null) => status === null || isOpenLesson(status);

/**
 * messages.lesson when the reply is linked to one (a platform reminder's), else the family's first
 * open lesson (ThreadDetail.lessons: the guardian's students') that starts on or after the message's
 * Riyadh day and has not ended at `now`. Null when there is none.
 */
export function replyLesson(m: ReplyOf, family: { lessons: readonly ThreadLesson[]; now: Date }): ReplyLesson | null {
  if (m.lesson_id && m.lesson) {
    return { id: m.lesson_id, starts_at: m.lesson.starts_at, ends_at: m.lesson.ends_at ?? null, status: m.lesson.status };
  }
  const day = chatDayKey(new Date(m.created_at), RIYADH_TZ);
  const candidates = family.lessons
    .map((l): ReplyLesson => ({ id: l.id, starts_at: l.starts_at, ends_at: l.ends_at ?? null, status: l.status ?? null }))
    .filter((l) => isOpen(l.status) && lessonNotEnded(l, family.now) && chatDayKey(new Date(l.starts_at), RIYADH_TZ) >= day)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return candidates[0] ?? null;
}

/** Whose confirm route: sales' POST /sales/lessons/:id/confirm (lessons.confirm) or the admin's (lessons.status). */
export type ConfirmRoute = 'sales' | 'admin';

export interface ReplyRights {
  reschedule: boolean;
  confirm: ConfirmRoute | null;
}

export const NO_REPLY_RIGHTS: ReplyRights = { reschedule: false, confirm: null };

/**
 * The chat viewer's lesson actions (docs/16 rows 37, 37b). `flow` = whose reschedule sheet the app
 * opens: sales' one-lesson sheet (GET /sales/schedule for the lesson, her /sales/booking/slots) or the admin's
 * (GET /lessons, GET /booking/slots, POST /lessons/:id/reschedule); null = none (teacher mode). Confirm: lessons.confirm
 * on sales' route (ANY lesson), else the admin's lessons.status route outside sales.
 */
export function replyRights(can: (key: Permission) => boolean, flow: 'sales' | 'admin' | null): ReplyRights {
  if (!flow) return NO_REPLY_RIGHTS;
  const sheet = flow === 'sales' ? can('self.sales') && can('self.sales_academy') : can('lessons.write') && can('lessons.read') && can('booking.write');
  const confirm = can('lessons.confirm') ? 'sales' : flow === 'admin' && can('lessons.status') ? 'admin' : null;
  return { reschedule: can('lessons.reschedule') && sheet, confirm };
}

/** The confirm request's path for `route`. */
export function replyConfirmPath(lessonId: string, route: ConfirmRoute): string {
  return route === 'sales' ? `/sales/lessons/${lessonId}/confirm` : `/lessons/${lessonId}/confirm`;
}
