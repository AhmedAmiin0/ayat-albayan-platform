import type { Locale } from '../../i18n/locale.js';
import { RIYADH_TZ } from '../../core/format/index.js';
import { lessonWhenAt } from '../lesson/booking-confirmation.js';
import type { ClockCycle } from '../../core/format/index.js';
import { quickReplyIntent } from './quick-reply.js';
import { lessonNotEnded, type ReplyLesson, type ReplyRights } from './reply-lesson.js';
import type { MessageView } from '../chat/views.js';

// The line under an inbound quick reply (R-MSG-05, R-SCH-03): what the system did, and what staff can
// do now (owner 2026-10-28). Pure; the web and the app fill inbox.quickReply.<key> with `when` and
// draw `action` as a secondary button (inbox.replyAction).

export type ReplyNoteKey = 'confirmed' | 'reschedule' | 'rescheduleNoLesson' | 'rescheduled' | 'stop';

export interface ReplyNoteAction {
  kind: 'confirm' | 'reschedule';
  lesson: ReplyLesson;
}

export interface ReplyNote {
  /** The line's key; null = the button alone (a «نعم» whose lesson is still to confirm). */
  key: ReplyNoteKey | null;
  /** «الأحد 4 أكتوبر 17:00», the academy's (Riyadh) time, of the lesson; null without one. */
  when: string | null;
  action: ReplyNoteAction | null;
}

export interface ReplyNoteContext {
  /** replyLesson: the linked lesson, else the family's next open one. */
  lesson: ReplyLesson | null;
  rights: ReplyRights;
  now: Date;
  /** Staff moved this reply's lesson from its button (the app remembers it: the family lesson is gone from the list). */
  moved?: boolean;
  /** The viewer's clock; `tz` = their zone (docs/34), the academy's when not given. */
  clock?: { locale: Locale; cycle: ClockCycle; tz?: string };
}

type NoteInput = Pick<MessageView, 'direction' | 'body' | 'guardian_id' | 'lead_id'>;

const DEFAULT_CLOCK = { locale: 'ar', cycle: '24' } as const;

function whenOf({ lesson, clock = DEFAULT_CLOCK }: ReplyNoteContext): string | null {
  if (!lesson) return null;
  return lessonWhenAt(new Date(lesson.starts_at), { ...clock, tz: clock.tz ?? RIYADH_TZ });
}

function rescheduleNote(ctx: ReplyNoteContext, when: string | null): ReplyNote {
  const { lesson } = ctx;
  if (ctx.moved || lesson?.status === 'rescheduled') return { key: 'rescheduled', when: null, action: null };
  const open = lesson && (lesson.status === null || lesson.status === 'scheduled' || lesson.status === 'confirmed');
  if (open && ctx.rights.reschedule && lessonNotEnded(lesson, ctx.now)) {
    return { key: 'reschedule', when, action: { kind: 'reschedule', lesson } };
  }
  return { key: 'rescheduleNoLesson', when: null, action: null };
}

function confirmNote(ctx: ReplyNoteContext, when: string | null): ReplyNote | null {
  const { lesson } = ctx;
  if (lesson?.status === 'confirmed') return { key: 'confirmed', when, action: null };
  if (lesson?.status === 'scheduled' && ctx.rights.confirm && lessonNotEnded(lesson, ctx.now)) {
    return { key: null, when, action: { kind: 'confirm', lesson } };
  }
  return null;
}

/**
 * A guardian's reschedule ask: «طلب تغيير موعد الحلقة» with «تغيير الموعد» for its lesson (open, not
 * ended, the viewer may move it), else «طلب تغيير الموعد»; «تم تغيير موعد الحلقة» once it moved.
 * A «نعم»: «تم تأكيد حلقة …» when its lesson is confirmed, else «تأكيد الحلقة» on a scheduled one the
 * viewer may confirm, else nothing. «وقف» from a guardian or a lead. Anything else → null.
 */
export function replyNote(m: NoteInput, ctx: ReplyNoteContext): ReplyNote | null {
  if (m.direction !== 'inbound' || !m.body) return null;
  const intent = quickReplyIntent(m.body);
  if (intent === 'stop') return m.guardian_id || m.lead_id ? { key: 'stop', when: null, action: null } : null;
  if (!m.guardian_id) return null;
  const when = whenOf(ctx);
  if (intent === 'reschedule') return rescheduleNote(ctx, when);
  return intent === 'confirm' ? confirmNote(ctx, when) : null;
}
