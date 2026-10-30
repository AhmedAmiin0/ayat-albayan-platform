import { durationText, type ClockCycle, type LessonView } from '@ab/shared';
import { clockIn, whenIn, type ViewerClock } from '@/core/lib/clock';
import { cityOf } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { chosenStart, lengthOf, type EditState } from './edit-time-body';

const lengths: Record<string, string | undefined> = t.enums.duration;

/** «45 دقيقة»; a migrated odd length reads «40 دقيقة», never a bare number. */
export const lengthText = (min: number): string => durationText(min, lengths, t.editTime.durationOther);

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة»: a start on the viewer's clock and its length. */
function timeSummary(startsAt: string, durationMin: number, viewer: ViewerClock): string {
  const when = whenIn(new Date(startsAt), viewer.tz, viewer.cycle);
  return `${when} · ${lengthText(durationMin)}`;
}

/** «الخميس 1 أكتوبر 16:00 · 45 دقيقة ← الأحد 4 أكتوبر 17:00 · 60 دقيقة»: what the edit changes. */
export function changeLine(lesson: LessonView, state: EditState, viewer: ViewerClock): string {
  return t.editTime.confirmLine
    .replace('{from}', timeSummary(lesson.starts_at, lengthOf(lesson), viewer))
    .replace('{to}', timeSummary(chosenStart(lesson, state.picked), state.durationMin, viewer));
}

/** «عند المعلم/ة 15:00 بتوقيت القاهرة» for the new start: always said, even when it reads the same. */
export function teacherLine(lesson: LessonView, startsAt: string, cycle: ClockCycle): string {
  const { tz } = lesson.teacher;
  return t.booking.teacherClock.replace('{time}', clockIn(new Date(startsAt), tz, cycle)).replace('{city}', cityOf(tz));
}
