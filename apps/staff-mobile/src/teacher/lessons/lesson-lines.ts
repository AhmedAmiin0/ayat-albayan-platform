import { otherZoneClock, type ClockCycle, type LessonView } from '@ab/shared';
import { t, locale } from '@ab/mobile-kit';
import { durationLabel, studentTimes } from '@/today';

// Her zone is the viewer's own (docs/07 principle 7), so no "your time" label; pure.

interface Clock {
  tz: string;
  cycle: ClockCycle;
}

/** Once per student zone whose clock differs from hers at the start. */
export function studentClocks(lesson: LessonView, { tz, cycle }: Clock): string {
  const start = new Date(lesson.starts_at);
  return [...new Set(lesson.students.map((s) => s.tz))]
    .flatMap((zone) => {
      const time = otherZoneClock(start, zone, { tz, cycle, locale });
      return time === null ? [] : [t.teacherDash.studentTime.replace('{time}', time)];
    })
    .join(' · ');
}

/** No teacher in the subtitle, since it is her. */
export function heroLine(lesson: LessonView, { tz, cycle }: Clock): string {
  const kinds = [
    lesson.trial ? t.schedule.trialTag : undefined,
    lesson.makeup ? t.booking.makeup.tag : undefined,
  ];
  return [...kinds, durationLabel(lesson), ...studentTimes(lesson, cycle, tz)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}
