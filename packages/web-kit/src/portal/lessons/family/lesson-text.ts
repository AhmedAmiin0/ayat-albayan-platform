import { dayWord, lessonMinutes, type DayWord } from '@ab/client-core';
import {
  clockOf,
  dateText,
  lessonWhenAt,
  sameClockAt,
  type ClockOptions,
  type PortalLesson,
} from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';

// The family cards' words for a lesson (boards PortalWebHome): Western digits, the viewer's
// 12 / 24 h cycle, on the clock given (the student's zone).

type Span = Pick<PortalLesson, 'starts_at' | 'ends_at'>;

const DAY_NAME: Record<DayWord, () => string> = {
  today: () => t.portal.app.lesson.today,
  tomorrow: () => t.portal.app.lesson.tomorrow,
};

/** «6:30 م – 7:15 م». */
export const spanText = (lesson: Span, clock: ClockOptions): string =>
  [lesson.starts_at, lesson.ends_at].map((at) => clockOf(new Date(at), clock)).join(' – ');

/** «اليوم» / «غدًا» / «الأحد 16 نوفمبر» for the day a lesson starts. */
export function dayName(lesson: Span, clock: ClockOptions, now: Date): string {
  const at = new Date(lesson.starts_at);
  const word = dayWord(at, now, clock.tz);
  if (word) return DAY_NAME[word]();
  return dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** «مع أ. فاطمة · 45 دقيقة» (the teacher only when the lesson names one). */
export function withLine(lesson: PortalLesson): string {
  const minutes = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  const named = lesson.teacher.display_name_ar;
  const teacher = named && t.portal.withTeacher.replace('{teacher}', teacherLabel(lesson.teacher));
  return [teacher, minutes].filter(Boolean).join(' · ');
}

/** The start on the viewer's own clock when it reads differently there (docs/34); else null. */
export function viewerLine(startsAt: string, clock: ClockOptions, viewer: string): string | null {
  const at = new Date(startsAt);
  if (sameClockAt(at, { a: clock.tz, b: viewer })) return null;
  return `${lessonWhenAt(at, { ...clock, tz: viewer })} ${t.schedule.viewerTime}`;
}
