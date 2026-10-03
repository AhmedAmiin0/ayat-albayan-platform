import { clockTime, lessonWhenText, RIYADH_TZ, type LessonView } from '@ab/shared';
import { cityOf } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { chosenStart, type EditState } from './edit-time-body';

const MINUTE = 60_000;
const lengths: Record<string, string | undefined> = t.enums.duration;

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة»: a start in Riyadh time and its length. */
export function timeSummary(startsAt: string, durationMin: number): string {
  const when = lessonWhenText(new Date(startsAt), RIYADH_TZ, locale);
  return `${when} · ${lengths[String(durationMin)] ?? String(durationMin)}`;
}

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة ← الأحد 4 أكتوبر 17:00 · 60 دقيقة»: what the edit changes. */
export function changeLine(lesson: LessonView, state: EditState): string {
  const was = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / MINUTE);
  return t.editTime.confirmLine
    .replace('{from}', timeSummary(lesson.starts_at, was))
    .replace('{to}', timeSummary(chosenStart(lesson, state.picked), state.durationMin));
}

/** «عند المعلم/ة 15:00 بتوقيت القاهرة» for the new start: always said, even when it reads like Riyadh's. */
export function teacherLine(lesson: LessonView, startsAt: string): string {
  const { tz } = lesson.teacher;
  return t.booking.teacherClock.replace('{time}', clockTime(new Date(startsAt), tz)).replace('{city}', cityOf(tz));
}
