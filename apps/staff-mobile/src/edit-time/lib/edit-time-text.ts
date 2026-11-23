import { durationText, type ClockCycle, type LessonView } from '@ab/shared';
import { clockIn, whenIn, type ViewerClock } from '@/core/lib/clock';
import { t, cityOf } from '@ab/mobile-kit';
import { chosenStart, lengthOf, type EditState } from './edit-time-body';

const lengths: Record<string, string | undefined> = t.enums.duration;

/** A migrated odd length still reads as minutes, never a bare number. */
export const lengthText = (min: number): string => durationText(min, lengths, t.editTime.durationOther);

function timeSummary(startsAt: string, durationMin: number, viewer: ViewerClock): string {
  const when = whenIn(new Date(startsAt), viewer.tz, viewer.cycle);
  return `${when} · ${lengthText(durationMin)}`;
}

export function changeLine(lesson: LessonView, state: EditState, viewer: ViewerClock): string {
  return t.editTime.confirmLine
    .replace('{from}', timeSummary(lesson.starts_at, lengthOf(lesson), viewer))
    .replace('{to}', timeSummary(chosenStart(lesson, state.picked), state.durationMin, viewer));
}

/** The teacher's local time for the new start is always shown, even when it reads the same. */
export function teacherLine(lesson: LessonView, startsAt: string, cycle: ClockCycle): string {
  const { tz } = lesson.teacher;
  return t.booking.teacherClock.replace('{time}', clockIn(new Date(startsAt), tz, cycle)).replace('{city}', cityOf(tz));
}
