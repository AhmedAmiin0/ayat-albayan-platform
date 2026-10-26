import { clockTime, durationText, lessonWhenText, RIYADH_TZ, type LessonView } from '@ab/shared';
import { cityOf } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { chosenStart, lengthOf, type EditState } from './edit-time-body';

const lengths: Record<string, string | undefined> = t.enums.duration;

/** «45 دقيقة»; a migrated odd length reads «40 دقيقة», never a bare number. */
export const lengthText = (min: number): string => durationText(min, lengths, t.editTime.durationOther);

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة»: a start in Riyadh time and its length. */
function timeSummary(startsAt: string, durationMin: number): string {
  const when = lessonWhenText(new Date(startsAt), RIYADH_TZ, locale);
  return `${when} · ${lengthText(durationMin)}`;
}

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة ← الأحد 4 أكتوبر 17:00 · 60 دقيقة»: what the edit changes. */
export function changeLine(lesson: LessonView, state: EditState): string {
  return t.editTime.confirmLine
    .replace('{from}', timeSummary(lesson.starts_at, lengthOf(lesson)))
    .replace('{to}', timeSummary(chosenStart(lesson, state.picked), state.durationMin));
}

/** «عند المعلم/ة 15:00 بتوقيت القاهرة» for the new start: always said, even when it reads like Riyadh's. */
export function teacherLine(lesson: LessonView, startsAt: string): string {
  const { tz } = lesson.teacher;
  return t.booking.teacherClock.replace('{time}', clockTime(new Date(startsAt), tz)).replace('{city}', cityOf(tz));
}
