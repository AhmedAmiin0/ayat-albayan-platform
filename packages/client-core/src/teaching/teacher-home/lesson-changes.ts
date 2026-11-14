import { COURSE_PAUSE_REASON, type LessonView } from '@ab/shared';

// «تنبيهات اليوم»: today's lessons cancelled or moved, with who and why (docs/47 move lines). Only
// what the teacher may read: her own reason, a pause, a move reason on her own lessons. An admin's
// other cancel text can be a series-end or course-stop note (money): it never shows.

export type ChangeWho = 'teacher' | 'admin' | 'moved';

export interface LessonChange {
  who: ChangeWho;
  reason: string | null;
  /** The start this lesson replaced (a move or a time edit). */
  from: string | null;
  /** The start of the lesson this one moved to. */
  to: string | null;
}

export type ChangeLesson = Pick<
  LessonView,
  'id' | 'status' | 'starts_at' | 'cancel_reason' | 'rescheduled_from_id'
> & { time_edit?: LessonView['time_edit'] };

type Reason = (l: ChangeLesson) => string | null;
const own: Reason = (l) => l.cancel_reason;
const pauseOnly: Reason = (l) => (l.cancel_reason === COURSE_PAUSE_REASON ? l.cancel_reason : null);

const CANCELLED: Partial<Record<LessonView['status'], { who: ChangeWho; reason: Reason }>> = {
  cancelled_by_teacher: { who: 'teacher', reason: own },
  cancelled_by_admin: { who: 'admin', reason: pauseOnly },
  rescheduled: { who: 'moved', reason: own },
};

/** The lesson a move came from, looked up in her own lessons. */
const byId = (lessons: readonly ChangeLesson[], id: string | null): ChangeLesson | undefined =>
  lessons.find((l) => id !== null && l.id === id);

const movedTo = (lessons: readonly ChangeLesson[], id: string): string | null =>
  lessons.find((l) => l.rescheduled_from_id === id)?.starts_at ?? null;

/** A cancelled or moved-away lesson: who, the reason she may read, and where it went. */
function closedChange(l: ChangeLesson, lessons: readonly ChangeLesson[]): LessonChange | null {
  const rule = CANCELLED[l.status];
  if (!rule) return null;
  return { who: rule.who, reason: rule.reason(l), from: null, to: movedTo(lessons, l.id) };
}

/** An open lesson that replaced another one or had its time edited: where it came from. */
function movedIn(l: ChangeLesson, lessons: readonly ChangeLesson[]): LessonChange | null {
  const old = byId(lessons, l.rescheduled_from_id);
  const from = old ? old.starts_at : editedFrom(l);
  if (from === undefined) return null;
  return { who: 'moved', reason: old ? old.cancel_reason : null, from, to: null };
}

const editedFrom = (l: ChangeLesson): string | undefined => l.time_edit?.was.starts_at;

/** What changed about a lesson, or null when nothing did. */
export const lessonChange = (
  l: ChangeLesson,
  lessons: readonly ChangeLesson[],
): LessonChange | null => closedChange(l, lessons) ?? movedIn(l, lessons);
